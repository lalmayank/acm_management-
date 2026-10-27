import uuid
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User, Role
from app.models.ticket import ValidatorPermission, TicketType
from app.core.security import hash_password
from app.core.permissions import RoleEnum
from app.api.deps import require_roles

router = APIRouter(prefix="/volunteers", tags=["Volunteer Management"])


class VolunteerCreate(BaseModel):
    name: str
    email: str
    password: str = "volunteer123"


class VolunteerPermissionUpdate(BaseModel):
    ticket_type_id: uuid.UUID
    allowed: bool


@router.get("/", dependencies=[Depends(require_roles("admin"))])
async def list_volunteers(db: AsyncSession = Depends(get_db)):
    """Admin lists all volunteer staff."""
    vol_role = (await db.execute(select(Role).where(Role.name == RoleEnum.VOLUNTEER.value))).scalar_one_or_none()
    if not vol_role:
        return []

    stmt = (
        select(User)
        .join(User.roles)
        .where(Role.name == RoleEnum.VOLUNTEER.value)
        .options(selectinload(User.roles))
    )
    res = await db.execute(stmt)
    volunteers = res.scalars().all()

    return [
        {
            "id": str(v.id),
            "name": v.name,
            "email": v.email,
            "is_active": v.is_active,
            "created_at": v.created_at.isoformat(),
        }
        for v in volunteers
    ]


@router.post("/", dependencies=[Depends(require_roles("admin"))])
async def create_volunteer(data: VolunteerCreate, db: AsyncSession = Depends(get_db)):
    """Admin creates a new volunteer account."""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    vol_role = (await db.execute(select(Role).where(Role.name == RoleEnum.VOLUNTEER.value))).scalar_one()

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        is_active=True,
        roles=[vol_role],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"id": str(user.id), "name": user.name, "email": user.email}
