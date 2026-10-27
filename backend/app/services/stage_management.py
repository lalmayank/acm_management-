import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stage import Presentation, StageState, StageHistory
from app.models.team import Team
from app.core.permissions import PresentationStatusEnum
from app.services.realtime import ws_manager


async def transition_stage(
    db: AsyncSession,
    actor_id: uuid.UUID,
    action: str,  # NEXT, ACTIVATE, COMPLETE, DELAY, RESET
    target_presentation_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Safely transition stage state, update presentations, record audit history,
    and broadcast live WebSocket updates to all connected portals.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch singleton stage_state
    stmt = select(StageState).where(StageState.id == "default_stage").with_for_update()
    res = await db.execute(stmt)
    state = res.scalar_one_or_none()
    if not state:
        state = StageState(id="default_stage", current_presentation_id=None, version=1)
        db.add(state)
        await db.flush()

    previous_id = state.current_presentation_id
    new_id = previous_id

    if action == "ACTIVATE" and target_presentation_id:
        # Mark previous as completed if active
        if previous_id and previous_id != target_presentation_id:
            prev_pres = await db.get(Presentation, previous_id)
            if prev_pres and prev_pres.status == PresentationStatusEnum.ON_STAGE.value:
                prev_pres.status = PresentationStatusEnum.COMPLETED.value

        target = await db.get(Presentation, target_presentation_id)
        if target:
            target.status = PresentationStatusEnum.ON_STAGE.value
            new_id = target.id

    elif action == "NEXT":
        # Advance to the next presentation in position order
        current_pos = 0
        if previous_id:
            prev_pres = await db.get(Presentation, previous_id)
            if prev_pres:
                prev_pres.status = PresentationStatusEnum.COMPLETED.value
                current_pos = prev_pres.position

        next_stmt = (
            select(Presentation)
            .where(
                Presentation.position > current_pos,
                Presentation.status.in_([PresentationStatusEnum.UPCOMING.value, PresentationStatusEnum.DELAYED.value]),
            )
            .order_by(Presentation.position.asc())
            .limit(1)
        )
        next_res = await db.execute(next_stmt)
        next_pres = next_res.scalar_one_or_none()
        if next_pres:
            next_pres.status = PresentationStatusEnum.ON_STAGE.value
            new_id = next_pres.id
        else:
            new_id = None

    elif action == "COMPLETE":
        if previous_id:
            prev_pres = await db.get(Presentation, previous_id)
            if prev_pres:
                prev_pres.status = PresentationStatusEnum.COMPLETED.value
        new_id = None

    elif action == "RESET":
        new_id = None

    # Update stage state version
    state.current_presentation_id = new_id
    state.version += 1

    # Record history
    history = StageHistory(
        previous_presentation_id=previous_id,
        new_presentation_id=new_id,
        actor_id=actor_id,
        changed_at=now,
    )
    db.add(history)
    await db.commit()

    # Get team details for broadcast
    team_name = "None"
    project_title = "None"
    if new_id:
        pres = (
            await db.execute(
                select(Presentation).where(Presentation.id == new_id).options(selectinload(Presentation.team))
            )
        ).scalar_one_or_none()
        if pres and pres.team:
            team_name = pres.team.name
            project_title = pres.team.project_title

    # Broadcast via WebSocket
    payload = {
        "type": "stage.updated",
        "version": state.version,
        "current_presentation_id": str(new_id) if new_id else None,
        "team_name": team_name,
        "project_title": project_title,
        "timestamp": now.isoformat(),
    }
    await ws_manager.broadcast(payload)

    return payload
