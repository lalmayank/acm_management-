import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.task import Task, TaskAssignment, TaskHistory
from app.models.user import User
from app.schemas.task import TaskCreate, TaskStatusUpdate, TaskResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/tasks", tags=["Assigned Work"])


@router.get("/my", response_model=List[TaskResponse])
async def list_my_assigned_tasks(
    current_user: User = Depends(require_roles("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """List operational tasks assigned to the current volunteer."""
    user_roles = [r.name.lower() for r in current_user.roles]

    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignments).selectinload(TaskAssignment.user)
        )
        .order_by(Task.due_at.asc().nulls_last(), Task.created_at.desc())
    )
    if "admin" not in user_roles:
        stmt = stmt.join(TaskAssignment, Task.id == TaskAssignment.task_id).where(
            TaskAssignment.user_id == current_user.id
        )

    res = await db.execute(stmt)
    tasks = res.scalars().all()

    return [
        TaskResponse(
            id=t.id,
            title=t.title,
            instructions=t.instructions,
            priority=t.priority,
            status=t.status,
            due_at=t.due_at,
            organizer_notes=t.organizer_notes,
            assigned_volunteers=[a.user.name for a in t.assignments if a.user],
            created_at=t.created_at,
        )
        for t in tasks
    ]


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: uuid.UUID,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("volunteer", "admin")),
):
    """Volunteer marks task as PENDING, IN_PROGRESS, COMPLETED, or BLOCKED."""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = data.status

    # Record history
    db.add(
        TaskHistory(
            task_id=task.id,
            actor_id=current_user.id,
            old_status=old_status,
            new_status=data.status,
            changed_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    return {"message": f"Task status updated to {data.status}"}


@router.post("/", response_model=TaskResponse, dependencies=[Depends(require_roles("admin"))])
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin creates a task and assigns volunteers."""
    task = Task(
        title=data.title,
        instructions=data.instructions,
        priority=data.priority,
        status="PENDING",
        due_at=data.due_at,
        organizer_notes=data.organizer_notes,
        created_by=current_user.id,
    )
    db.add(task)
    await db.flush()

    for uid in data.assigned_user_ids:
        db.add(TaskAssignment(task_id=task.id, user_id=uid))

    await db.commit()

    return TaskResponse(
        id=task.id,
        title=task.title,
        instructions=task.instructions,
        priority=task.priority,
        status=task.status,
        due_at=task.due_at,
        organizer_notes=task.organizer_notes,
        assigned_volunteers=[],
        created_at=task.created_at,
    )
