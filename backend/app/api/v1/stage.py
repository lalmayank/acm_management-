import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.stage import Presentation, StageState
from app.models.team import Team
from app.models.user import User
from app.schemas.stage import (
    PresentationCreate,
    PresentationUpdate,
    PresentationResponse,
    StageTransitionRequest,
    StageStateResponse,
)
from app.services.stage_management import transition_stage
from app.core.permissions import PresentationStatusEnum
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/stage", tags=["Stage & Schedule"])


@router.get("/current", response_model=StageStateResponse)
async def get_current_stage_state(db: AsyncSession = Depends(get_db)):
    """Public/shared endpoint: get currently active pitch presentation and upcoming queue."""
    state_stmt = select(StageState).where(StageState.id == "default_stage")
    state = (await db.execute(state_stmt)).scalar_one_or_none()

    current_pres_resp = None
    if state and state.current_presentation_id:
        c_stmt = (
            select(Presentation)
            .where(Presentation.id == state.current_presentation_id)
            .options(selectinload(Presentation.team))
        )
        c_pres = (await db.execute(c_stmt)).scalar_one_or_none()
        if c_pres and c_pres.team:
            current_pres_resp = PresentationResponse(
                id=c_pres.id,
                team_id=c_pres.team_id,
                team_name=c_pres.team.name,
                project_title=c_pres.team.project_title,
                position=c_pres.position,
                scheduled_start=c_pres.scheduled_start,
                status=c_pres.status,
                organizer_notes=c_pres.organizer_notes,
            )

    # Get upcoming presentations
    up_stmt = (
        select(Presentation)
        .where(Presentation.status.in_([PresentationStatusEnum.UPCOMING.value, PresentationStatusEnum.DELAYED.value]))
        .options(selectinload(Presentation.team))
        .order_by(Presentation.position.asc())
        .limit(5)
    )
    up_res = await db.execute(up_stmt)
    upcoming_pres = up_res.scalars().all()

    upcoming_list = [
        PresentationResponse(
            id=p.id,
            team_id=p.team_id,
            team_name=p.team.name if p.team else "Team",
            project_title=p.team.project_title if p.team else "Project",
            position=p.position,
            scheduled_start=p.scheduled_start,
            status=p.status,
            organizer_notes=p.organizer_notes,
        )
        for p in upcoming_pres
    ]

    return StageStateResponse(
        current_presentation=current_pres_resp,
        upcoming_presentations=upcoming_list,
        version=state.version if state else 1,
        last_updated=state.updated_at if state else datetime.now(timezone.utc),
    )


@router.get("/schedule", response_model=List[PresentationResponse])
async def get_full_schedule(db: AsyncSession = Depends(get_db)):
    """List full schedule ordered by presentation position."""
    stmt = (
        select(Presentation)
        .options(selectinload(Presentation.team))
        .order_by(Presentation.position.asc())
    )
    res = await db.execute(stmt)
    presentations = res.scalars().all()

    return [
        PresentationResponse(
            id=p.id,
            team_id=p.team_id,
            team_name=p.team.name if p.team else "Team",
            project_title=p.team.project_title if p.team else "Project",
            position=p.position,
            scheduled_start=p.scheduled_start,
            status=p.status,
            organizer_notes=p.organizer_notes,
        )
        for p in presentations
    ]


@router.post("/schedule", response_model=PresentationResponse, dependencies=[Depends(require_roles("admin"))])
async def add_presentation_to_schedule(
    data: PresentationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Admin adds a team to the presentation schedule."""
    team = await db.get(Team, data.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    pres = Presentation(
        team_id=data.team_id,
        position=data.position,
        scheduled_start=data.scheduled_start,
        status=PresentationStatusEnum.UPCOMING.value,
        organizer_notes=data.organizer_notes,
    )
    db.add(pres)
    await db.commit()
    await db.refresh(pres)

    return PresentationResponse(
        id=pres.id,
        team_id=team.id,
        team_name=team.name,
        project_title=team.project_title,
        position=pres.position,
        scheduled_start=pres.scheduled_start,
        status=pres.status,
        organizer_notes=pres.organizer_notes,
    )


@router.post("/transition", dependencies=[Depends(require_roles("admin"))])
async def advance_stage_transition(
    data: StageTransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Organizer transitions stage: NEXT, ACTIVATE, COMPLETE, DELAY, RESET.
    Broadcasts state immediately across all connected clients.
    """
    payload = await transition_stage(
        db=db,
        actor_id=current_user.id,
        action=data.action,
        target_presentation_id=data.target_presentation_id,
    )
    return payload
