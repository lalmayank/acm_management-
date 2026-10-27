import io
import csv
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User, Role
from app.models.participant import Participant
from app.models.team import TeamMember, Team
from app.models.ticket import TicketEntitlement, TicketType, TicketRedemption, TeamTicketAllocation
from app.schemas.participant import (
    ParticipantCreate,
    ParticipantResponse,
    CSVImportResult,
)
from app.schemas.ticket import TicketEntitlementResponse
from app.core.security import hash_password
from app.core.permissions import RoleEnum
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/participants", tags=["Participants"])


@router.get("/me", response_model=ParticipantResponse)
async def get_my_participant_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated participant's profile and team name."""
    stmt = (
        select(Participant)
        .where(Participant.user_id == current_user.id)
        .options(
            selectinload(Participant.team_memberships)
            .selectinload(TeamMember.team)
        )
    )
    res = await db.execute(stmt)
    participant = res.scalar_one_or_none()

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant profile not found for this user account",
        )

    team_name = None
    team_id = None
    if participant.team_memberships:
        active_mem = next((m for m in participant.team_memberships if m.status == "ACTIVE"), None)
        if active_mem and active_mem.team:
            team_name = active_mem.team.name
            team_id = active_mem.team.id

    return ParticipantResponse(
        id=participant.id,
        user_id=current_user.id,
        name=participant.name,
        email=current_user.email,
        registration_code=participant.registration_code,
        phone=participant.phone,
        college=participant.college,
        team_name=team_name,
        team_id=team_id,
        is_active=current_user.is_active,
    )


@router.get("/me/tickets", response_model=List[TicketEntitlementResponse])
async def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tickets/entitlements allocated to the current participant."""
    stmt = select(Participant).where(Participant.user_id == current_user.id)
    p_res = await db.execute(stmt)
    participant = p_res.scalar_one_or_none()
    if not participant:
        return []

    ent_stmt = (
        select(TicketEntitlement)
        .where(TicketEntitlement.participant_id == participant.id)
        .options(
            selectinload(TicketEntitlement.ticket_type),
            selectinload(TicketEntitlement.allocation).selectinload(TeamTicketAllocation.team),
        )
    )
    ent_res = await db.execute(ent_stmt)
    entitlements = ent_res.scalars().all()

    results = []
    for ent in entitlements:
        results.append(
            TicketEntitlementResponse(
                id=ent.id,
                ticket_type_id=ent.ticket_type_id,
                ticket_name=ent.ticket_type.name,
                category=ent.ticket_type.category,
                description=ent.ticket_type.description,
                allowed_uses=ent.allowed_uses,
                used_count=ent.used_count,
                status=ent.status,
                secret_code=ent.secret_code,
                valid_from=ent.ticket_type.valid_from,
                valid_until=ent.ticket_type.valid_until,
                team_name=None,
            )
        )
    return results


@router.get("/me/history")
async def get_my_redemption_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read-only log of the participant's own redemptions."""
    stmt = select(Participant).where(Participant.user_id == current_user.id)
    participant = (await db.execute(stmt)).scalar_one_or_none()
    if not participant:
        return []

    red_stmt = (
        select(TicketRedemption)
        .join(TicketEntitlement, TicketRedemption.entitlement_id == TicketEntitlement.id)
        .where(TicketEntitlement.participant_id == participant.id)
        .options(
            selectinload(TicketRedemption.entitlement).selectinload(TicketEntitlement.ticket_type),
            selectinload(TicketRedemption.validator),
        )
        .order_by(TicketRedemption.redeemed_at.desc())
    )
    res = await db.execute(red_stmt)
    redemptions = res.scalars().all()

    return [
        {
            "id": str(r.id),
            "ticket_name": r.entitlement.ticket_type.name,
            "category": r.entitlement.ticket_type.category,
            "use_number": r.use_number,
            "redeemed_at": r.redeemed_at.isoformat(),
            "validator_name": r.validator.name if r.validator else "Authorized Staff",
        }
        for r in redemptions
    ]


# Admin Endpoints
@router.get("/", response_model=List[ParticipantResponse], dependencies=[Depends(require_roles("admin"))])
async def list_all_participants(db: AsyncSession = Depends(get_db)):
    """List all registered participants for Admin dashboard."""
    stmt = (
        select(Participant)
        .options(
            selectinload(Participant.user),
            selectinload(Participant.team_memberships).selectinload(TeamMember.team),
        )
        .order_by(Participant.name.asc())
    )
    res = await db.execute(stmt)
    participants = res.scalars().all()

    output = []
    for p in participants:
        team_name = None
        team_id = None
        if p.team_memberships:
            active_m = next((m for m in p.team_memberships if m.status == "ACTIVE"), None)
            if active_m and active_m.team:
                team_name = active_m.team.name
                team_id = active_m.team.id

        output.append(
            ParticipantResponse(
                id=p.id,
                user_id=p.user_id,
                name=p.name,
                email=p.user.email if p.user else "",
                registration_code=p.registration_code,
                phone=p.phone,
                college=p.college,
                team_name=team_name,
                team_id=team_id,
                is_active=p.user.is_active if p.user else True,
            )
        )
    return output


@router.post("/", response_model=ParticipantResponse, dependencies=[Depends(require_roles("admin"))])
async def create_single_participant(
    data: ParticipantCreate,
    db: AsyncSession = Depends(get_db),
):
    """Admin manually creates a single participant and their login account."""
    # Check duplicate email or code
    chk_stmt = (
        select(User)
        .outerjoin(Participant, User.id == Participant.user_id)
        .where((User.email == data.email) | (Participant.registration_code == data.registration_code))
    )
    if (await db.execute(chk_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or Registration Code already in use")

    part_role = (await db.execute(select(Role).where(Role.name == RoleEnum.PARTICIPANT.value))).scalar_one()

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password or "participant123"),
        is_active=True,
        roles=[part_role],
    )
    db.add(user)
    await db.flush()

    participant = Participant(
        user_id=user.id,
        registration_code=data.registration_code,
        name=data.name,
        phone=data.phone,
        college=data.college,
    )
    db.add(participant)
    await db.commit()

    return ParticipantResponse(
        id=participant.id,
        user_id=user.id,
        name=participant.name,
        email=user.email,
        registration_code=participant.registration_code,
        phone=participant.phone,
        college=participant.college,
        is_active=user.is_active,
    )


@router.post("/import-csv", response_model=CSVImportResult, dependencies=[Depends(require_roles("admin"))])
async def import_participants_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Batch import participants from CSV (headers: name, email, registration_code, phone, college)."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    part_role = (await db.execute(select(Role).where(Role.name == RoleEnum.PARTICIPANT.value))).scalar_one()

    total = 0
    created = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        total += 1
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()
        code = row.get("registration_code", "").strip()
        phone = row.get("phone", "").strip()
        college = row.get("college", "").strip()

        if not name or not email or not code:
            errors.append(f"Row {row_idx}: Missing required field (name, email, or registration_code)")
            continue

        # Check existing
        existing = (
            await db.execute(
                select(User).outerjoin(Participant).where((User.email == email) | (Participant.registration_code == code))
            )
        ).scalar_one_or_none()

        if existing:
            errors.append(f"Row {row_idx}: Duplicate email '{email}' or code '{code}'")
            continue

        user = User(
            email=email,
            name=name,
            password_hash=hash_password("participant123"),
            is_active=True,
            roles=[part_role],
        )
        db.add(user)
        await db.flush()

        part = Participant(
            user_id=user.id,
            registration_code=code,
            name=name,
            phone=phone or None,
            college=college or None,
        )
        db.add(part)
        created += 1

    await db.commit()
    return CSVImportResult(total_processed=total, created=created, updated=0, errors=errors)
