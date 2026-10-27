import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ticket import (
    TicketEntitlement,
    TicketRedemption,
    ScanAttempt,
    TicketType,
    ValidatorPermission,
)
from app.models.participant import Participant
from app.models.team import Team, TeamMember
from app.core.permissions import TicketStatusEnum, ScanOutcomeEnum


async def redeem_ticket(
    db: AsyncSession,
    validator_id: uuid.UUID,
    ticket_reference: str,
    target_ticket_type_id: Optional[uuid.UUID] = None,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Atomic, concurrency-safe redemption with row-level locking.
    Prevents duplicate scans across simultaneous validators.
    """
    now = datetime.now(timezone.utc)

    # 1. Check idempotency
    if idempotency_key:
        idem_stmt = (
            select(TicketRedemption)
            .where(TicketRedemption.idempotency_key == idempotency_key)
            .options(
                selectinload(TicketRedemption.entitlement)
                .selectinload(TicketEntitlement.participant),
                selectinload(TicketRedemption.entitlement)
                .selectinload(TicketEntitlement.ticket_type),
            )
        )
        idem_res = await db.execute(idem_stmt)
        existing_redemption = idem_res.scalar_one_or_none()
        if existing_redemption:
            ent = existing_redemption.entitlement
            return {
                "outcome": ScanOutcomeEnum.VALID.value,
                "message": "Redemption already confirmed (idempotent replay)",
                "participant_name": ent.participant.name,
                "registration_code": ent.participant.registration_code,
                "ticket_name": ent.ticket_type.name,
                "allowed_uses": ent.allowed_uses,
                "used_count": ent.used_count,
                "redeemed_at": existing_redemption.redeemed_at,
            }

    # 2. Look up entitlement with pessimistic row-locking (with_for_update)
    stmt = (
        select(TicketEntitlement)
        .where(
            (TicketEntitlement.secret_code == ticket_reference) |
            (TicketEntitlement.id == (uuid.UUID(ticket_reference) if _is_valid_uuid(ticket_reference) else None))
        )
        .with_for_update()
        .options(
            selectinload(TicketEntitlement.participant)
            .selectinload(Participant.team_memberships)
            .selectinload(TeamMember.team),
            selectinload(TicketEntitlement.ticket_type),
        )
    )

    res = await db.execute(stmt)
    entitlement = res.scalar_one_or_none()

    if not entitlement:
        # Record failed attempt
        attempt = ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.VERIFICATION_FAILED.value,
            reason="Ticket entitlement not found",
        )
        db.add(attempt)
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.VERIFICATION_FAILED.value,
            "message": "Invalid ticket reference",
        }

    ticket_type = entitlement.ticket_type
    participant = entitlement.participant
    team_name = None
    if participant.team_memberships:
        team_name = participant.team_memberships[0].team.name

    # 3. Check if validator has permission for this ticket type
    perm_stmt = select(ValidatorPermission).where(
        ValidatorPermission.user_id == validator_id,
        ValidatorPermission.ticket_type_id == ticket_type.id,
    )
    perm_res = await db.execute(perm_stmt)
    perm = perm_res.scalar_one_or_none()
    # If explicit permissions exist, check if allowed
    if perm and not perm.allowed:
        db.add(ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.NOT_AUTHORIZED.value,
            reason="Validator not authorized for this ticket category",
        ))
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.NOT_AUTHORIZED.value,
            "message": "You are not authorized to validate this ticket type",
            "ticket_name": ticket_type.name,
        }

    # 4. Check category match if requested
    if target_ticket_type_id and target_ticket_type_id != ticket_type.id:
        db.add(ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.NOT_ELIGIBLE.value,
            reason=f"Wrong ticket category: presented {ticket_type.name}",
        ))
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.NOT_ELIGIBLE.value,
            "message": f"Wrong category. Expected selected ticket, but received '{ticket_type.name}'",
            "ticket_name": ticket_type.name,
        }

    # 5. Check ticket active status & validity window
    if not ticket_type.is_active or entitlement.status == TicketStatusEnum.REVOKED.value:
        db.add(ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.REVOKED.value,
            reason="Ticket is inactive or revoked",
        ))
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.REVOKED.value,
            "message": "This ticket has been revoked by event organizers",
            "participant_name": participant.name,
            "ticket_name": ticket_type.name,
        }

    if (ticket_type.valid_from and now < ticket_type.valid_from) or (
        ticket_type.valid_until and now > ticket_type.valid_until
    ):
        db.add(ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.EXPIRED.value,
            reason="Ticket validity window expired or not yet active",
        ))
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.EXPIRED.value,
            "message": "Ticket has expired or is not yet active",
            "participant_name": participant.name,
            "ticket_name": ticket_type.name,
        }

    # 6. Check remaining uses
    if entitlement.used_count >= entitlement.allowed_uses:
        db.add(ScanAttempt(
            validator_id=validator_id,
            ticket_reference=ticket_reference,
            outcome=ScanOutcomeEnum.ALREADY_REDEEMED.value,
            reason="All permitted uses consumed",
        ))
        await db.commit()
        return {
            "outcome": ScanOutcomeEnum.ALREADY_REDEEMED.value,
            "message": f"Already redeemed! ({entitlement.used_count}/{entitlement.allowed_uses} uses consumed)",
            "participant_name": participant.name,
            "registration_code": participant.registration_code,
            "team_name": team_name,
            "ticket_name": ticket_type.name,
            "allowed_uses": entitlement.allowed_uses,
            "used_count": entitlement.used_count,
        }

    # 7. Perform Atomic Consumption
    entitlement.used_count += 1
    use_number = entitlement.used_count

    if entitlement.used_count >= entitlement.allowed_uses:
        entitlement.status = TicketStatusEnum.REDEEMED.value
    else:
        entitlement.status = TicketStatusEnum.PARTIALLY_USED.value

    redemption = TicketRedemption(
        entitlement_id=entitlement.id,
        use_number=use_number,
        validator_id=validator_id,
        redeemed_at=now,
        idempotency_key=idempotency_key,
    )
    db.add(redemption)

    # Record successful scan attempt
    db.add(ScanAttempt(
        validator_id=validator_id,
        ticket_reference=ticket_reference,
        outcome=ScanOutcomeEnum.VALID.value,
        reason=f"Successfully redeemed use {use_number}/{entitlement.allowed_uses}",
    ))

    await db.commit()

    return {
        "outcome": ScanOutcomeEnum.VALID.value,
        "message": f"VALID — Redemption recorded (Use {use_number} of {entitlement.allowed_uses})",
        "participant_name": participant.name,
        "registration_code": participant.registration_code,
        "team_name": team_name,
        "ticket_name": ticket_type.name,
        "allowed_uses": entitlement.allowed_uses,
        "used_count": entitlement.used_count,
        "redeemed_at": now,
    }


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError):
        return False
