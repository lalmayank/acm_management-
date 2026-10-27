import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.participant import Participant
from app.models.team import Team
from app.models.user import User, Role
from app.models.ticket import TicketEntitlement, TicketRedemption, ScanAttempt
from app.models.task import Task
from app.models.stage import StageState, Presentation
from app.models.audit import AuditLog
from app.schemas.report import DashboardStatsResponse
from app.core.permissions import RoleEnum, TicketStatusEnum, TaskStatusEnum
from app.api.deps import require_roles

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/stats", response_model=DashboardStatsResponse, dependencies=[Depends(require_roles("admin", "volunteer"))])
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Summary metrics for the Admin and Volunteer command dashboard."""
    part_count = (await db.execute(select(func.count(Participant.id)))).scalar() or 0
    team_count = (await db.execute(select(func.count(Team.id)))).scalar() or 0

    # Volunteer count
    vol_stmt = select(func.count(User.id)).join(User.roles).where(Role.name == RoleEnum.VOLUNTEER.value)
    vol_count = (await db.execute(vol_stmt)).scalar() or 0

    # Ticket stats
    issued_count = (await db.execute(select(func.count(TicketEntitlement.id)))).scalar() or 0
    redeemed_count = (
        await db.execute(
            select(func.count(TicketEntitlement.id)).where(TicketEntitlement.status == TicketStatusEnum.REDEEMED.value)
        )
    ).scalar() or 0

    # Tasks pending
    pending_tasks = (
        await db.execute(
            select(func.count(Task.id)).where(Task.status.in_([TaskStatusEnum.PENDING.value, TaskStatusEnum.IN_PROGRESS.value]))
        )
    ).scalar() or 0

    # Current stage
    state_stmt = select(StageState).where(StageState.id == "default_stage")
    stage_state = (await db.execute(state_stmt)).scalar_one_or_none()
    active_stage_team = "None"
    if stage_state and stage_state.current_presentation_id:
        p_stmt = (
            select(Presentation)
            .where(Presentation.id == stage_state.current_presentation_id)
            .options(selectinload(Presentation.team))
        )
        pres = (await db.execute(p_stmt)).scalar_one_or_none()
        if pres and pres.team:
            active_stage_team = f"{pres.team.name} — {pres.team.project_title}"

    # Recent scans
    scans_stmt = (
        select(ScanAttempt)
        .options(selectinload(ScanAttempt.validator))
        .order_by(ScanAttempt.created_at.desc())
        .limit(6)
    )
    scans_res = await db.execute(scans_stmt)
    scans = scans_res.scalars().all()
    recent_scans = [
        {
            "id": str(s.id),
            "outcome": s.outcome,
            "validator": s.validator.name if s.validator else "Staff",
            "reference": s.ticket_reference[:12] + "...",
            "created_at": s.created_at.isoformat(),
        }
        for s in scans
    ]

    return DashboardStatsResponse(
        total_participants=part_count,
        total_teams=team_count,
        total_volunteers=vol_count,
        total_tickets_issued=issued_count,
        total_tickets_redeemed=redeemed_count,
        pending_tasks=pending_tasks,
        active_stage_team=active_stage_team,
        recent_scans=recent_scans,
    )


@router.get("/audit-logs", dependencies=[Depends(require_roles("admin"))])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    """Full chronological audit trail."""
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "id": str(l.id),
            "actor": l.actor.name if l.actor else "System",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
