import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ticket import TicketType, TeamTicketAllocation, TicketEntitlement
from app.models.team import Team, TeamMember
from app.models.participant import Participant
from app.core.permissions import TicketStatusEnum

logger = logging.getLogger(__name__)


async def issue_tickets(
    db: AsyncSession,
    ticket_type_id: uuid.UUID,
    team_ids: List[uuid.UUID],
    participant_ids: List[uuid.UUID],
    quantity_per_member: int = 1,
) -> Dict[str, Any]:
    """
    Transactionally issue ticket allocations and member entitlements.
    Guarantees that each eligible member receives their own entitlement.
    """
    ticket_type = await db.get(TicketType, ticket_type_id)
    if not ticket_type or not ticket_type.is_active:
        raise ValueError("Invalid or inactive ticket type")

    created_allocations = 0
    created_entitlements = 0
    skipped_existing = 0

    # 1. Process Team-Wise Issuance
    for team_id in team_ids:
        team_stmt = (
            select(Team)
            .where(Team.id == team_id)
            .options(selectinload(Team.members).selectinload(TeamMember.participant))
        )
        res = await db.execute(team_stmt)
        team = res.scalar_one_or_none()
        if not team:
            continue

        # Check or create TeamTicketAllocation
        alloc_stmt = select(TeamTicketAllocation).where(
            TeamTicketAllocation.ticket_type_id == ticket_type_id,
            TeamTicketAllocation.team_id == team_id,
        )
        alloc_res = await db.execute(alloc_stmt)
        allocation = alloc_res.scalar_one_or_none()
        if not allocation:
            allocation = TeamTicketAllocation(
                ticket_type_id=ticket_type_id,
                team_id=team_id,
                quantity_per_member=quantity_per_member,
            )
            db.add(allocation)
            await db.flush()
            created_allocations += 1

        # Issue entitlement for each active member
        for member in team.members:
            if member.status != "ACTIVE":
                continue

            # Check if entitlement already exists
            ent_stmt = select(TicketEntitlement).where(
                TicketEntitlement.allocation_id == allocation.id,
                TicketEntitlement.participant_id == member.participant_id,
            )
            ent_res = await db.execute(ent_stmt)
            if ent_res.scalar_one_or_none():
                skipped_existing += 1
                continue

            entitlement = TicketEntitlement(
                ticket_type_id=ticket_type_id,
                allocation_id=allocation.id,
                participant_id=member.participant_id,
                allowed_uses=quantity_per_member,
                used_count=0,
                status=TicketStatusEnum.AVAILABLE.value,
            )
            db.add(entitlement)
            created_entitlements += 1

    # 2. Process Individual Participant Issuance
    for participant_id in participant_ids:
        part = await db.get(Participant, participant_id)
        if not part:
            continue

        # Check existing direct entitlement
        ent_stmt = select(TicketEntitlement).where(
            TicketEntitlement.ticket_type_id == ticket_type_id,
            TicketEntitlement.participant_id == participant_id,
            TicketEntitlement.allocation_id.is_(None),
        )
        ent_res = await db.execute(ent_stmt)
        if ent_res.scalar_one_or_none():
            skipped_existing += 1
            continue

        entitlement = TicketEntitlement(
            ticket_type_id=ticket_type_id,
            allocation_id=None,
            participant_id=participant_id,
            allowed_uses=quantity_per_member,
            used_count=0,
            status=TicketStatusEnum.AVAILABLE.value,
        )
        db.add(entitlement)
        created_entitlements += 1

    await db.commit()

    return {
        "created_allocations": created_allocations,
        "created_entitlements": created_entitlements,
        "skipped_existing": skipped_existing,
    }
