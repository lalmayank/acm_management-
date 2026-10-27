import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.ticket import (
    TicketType,
    TeamTicketAllocation,
    TicketEntitlement,
    TicketRedemption,
    ValidatorPermission,
)
from app.models.team import Team, TeamMember
from app.models.participant import Participant
from app.schemas.ticket import (
    TicketTypeCreate,
    TicketTypeUpdate,
    TicketTypeResponse,
    TicketIssuanceRequest,
    TeamTicketStatusResponse,
    MemberEntitlementStatusResponse,
)
from app.services.ticket_issuance import issue_tickets
from app.core.permissions import TicketStatusEnum
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("/types", response_model=List[TicketTypeResponse])
async def list_ticket_types(db: AsyncSession = Depends(get_db)):
    """List all ticket types with active entitlement & redemption counts."""
    stmt = select(TicketType).order_by(TicketType.created_at.desc())
    res = await db.execute(stmt)
    ticket_types = res.scalars().all()

    results = []
    for tt in ticket_types:
        # Count entitlements
        ent_count_res = await db.execute(
            select(func.count(TicketEntitlement.id)).where(TicketEntitlement.ticket_type_id == tt.id)
        )
        total_ent = ent_count_res.scalar() or 0

        redeemed_count_res = await db.execute(
            select(func.count(TicketEntitlement.id)).where(
                TicketEntitlement.ticket_type_id == tt.id,
                TicketEntitlement.status == TicketStatusEnum.REDEEMED.value,
            )
        )
        total_red = redeemed_count_res.scalar() or 0

        results.append(
            TicketTypeResponse(
                id=tt.id,
                name=tt.name,
                description=tt.description,
                category=tt.category,
                valid_from=tt.valid_from,
                valid_until=tt.valid_until,
                is_active=tt.is_active,
                allowed_uses_per_member=tt.allowed_uses_per_member,
                total_entitlements=total_ent,
                total_redeemed=total_red,
                total_pending=max(0, total_ent - total_red),
            )
        )
    return results


@router.post("/types", response_model=TicketTypeResponse, dependencies=[Depends(require_roles("admin"))])
async def create_ticket_type(data: TicketTypeCreate, db: AsyncSession = Depends(get_db)):
    """Admin creates a generic ticket definition."""
    existing = await db.execute(select(TicketType).where(TicketType.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ticket type name already exists")

    tt = TicketType(
        name=data.name,
        description=data.description,
        category=data.category,
        rules=data.rules or {},
        valid_from=data.valid_from or datetime.now(timezone.utc),
        valid_until=data.valid_until,
        allowed_uses_per_member=data.allowed_uses_per_member,
        is_active=True,
    )
    db.add(tt)
    await db.commit()
    await db.refresh(tt)

    return TicketTypeResponse(
        id=tt.id,
        name=tt.name,
        description=tt.description,
        category=tt.category,
        valid_from=tt.valid_from,
        valid_until=tt.valid_until,
        is_active=tt.is_active,
        allowed_uses_per_member=tt.allowed_uses_per_member,
        total_entitlements=0,
        total_redeemed=0,
        total_pending=0,
    )


@router.post("/types/{ticket_type_id}/issue", dependencies=[Depends(require_roles("admin"))])
async def issue_ticket_type(
    ticket_type_id: uuid.UUID,
    data: TicketIssuanceRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Transactional issuance endpoint.
    Creates 1 entitlement per eligible member under the team allocation.
    """
    try:
        summary = await issue_tickets(
            db=db,
            ticket_type_id=ticket_type_id,
            team_ids=data.team_ids,
            participant_ids=data.participant_ids,
            quantity_per_member=data.quantity_per_member,
        )
        return {"status": "success", "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/types/{ticket_type_id}/teams", response_model=List[TeamTicketStatusResponse])
async def get_team_wise_ticket_history(
    ticket_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles("admin", "volunteer")),
):
    """
    Authoritative Team-Wise History.
    Lists every allocated team (including teams with 0 scans) and their individual members' status.
    """
    # 1. Fetch all allocations for this ticket type
    alloc_stmt = (
        select(TeamTicketAllocation)
        .where(TeamTicketAllocation.ticket_type_id == ticket_type_id)
        .options(
            selectinload(TeamTicketAllocation.team)
            .selectinload(Team.members)
            .selectinload(TeamMember.participant)
        )
    )
    alloc_res = await db.execute(alloc_stmt)
    allocations = alloc_res.scalars().all()

    results = []
    for alloc in allocations:
        team = alloc.team
        members_status = []
        redeemed_count = 0

        for member in team.members:
            if member.status != "ACTIVE":
                continue

            # Fetch member's entitlement under this allocation
            ent_stmt = (
                select(TicketEntitlement)
                .where(
                    TicketEntitlement.allocation_id == alloc.id,
                    TicketEntitlement.participant_id == member.participant_id,
                )
                .options(
                    selectinload(TicketEntitlement.redemptions).selectinload(TicketRedemption.validator)
                )
            )
            ent_res = await db.execute(ent_stmt)
            ent = ent_res.scalar_one_or_none()

            status_str = "PENDING"
            allowed_uses = alloc.quantity_per_member
            used_count = 0
            last_redeemed = None
            validator_name = None

            if ent:
                status_str = ent.status
                allowed_uses = ent.allowed_uses
                used_count = ent.used_count
                if ent.redemptions:
                    last_red = ent.redemptions[-1]
                    last_redeemed = last_red.redeemed_at
                    if last_red.validator:
                        validator_name = last_red.validator.name

            if status_str == TicketStatusEnum.REDEEMED.value:
                redeemed_count += 1

            members_status.append(
                MemberEntitlementStatusResponse(
                    participant_id=member.participant_id,
                    name=member.participant.name,
                    registration_code=member.participant.registration_code,
                    entitlement_id=ent.id if ent else None,
                    status=status_str,
                    allowed_uses=allowed_uses,
                    used_count=used_count,
                    last_redeemed_at=last_redeemed,
                    validator_name=validator_name,
                )
            )

        total_m = len(members_status)
        results.append(
            TeamTicketStatusResponse(
                team_id=team.id,
                team_name=team.name,
                team_code=team.team_code,
                total_members=total_m,
                redeemed_count=redeemed_count,
                pending_count=max(0, total_m - redeemed_count),
                members=members_status,
            )
        )
    return results


@router.post("/entitlements/{entitlement_id}/revoke", dependencies=[Depends(require_roles("admin"))])
async def revoke_entitlement(entitlement_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Admin revokes a single ticket entitlement."""
    ent = await db.get(TicketEntitlement, entitlement_id)
    if not ent:
        raise HTTPException(status_code=404, detail="Entitlement not found")
    ent.status = TicketStatusEnum.REVOKED.value
    await db.commit()
    return {"message": "Entitlement revoked successfully"}
