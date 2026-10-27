import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.announcement import Announcement, AnnouncementRead
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
)
from app.services.realtime import ws_manager
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("/", response_model=List[AnnouncementResponse])
async def list_active_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List valid published announcements filtered by audience and validity window."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Announcement)
        .where(
            Announcement.is_published == True,
            Announcement.publish_at <= now,
            (Announcement.expires_at.is_(None) | (Announcement.expires_at > now)),
        )
        .order_by(Announcement.publish_at.desc())
    )
    res = await db.execute(stmt)
    announcements = res.scalars().all()

    # Filter by user role if logged in
    user_roles = [r.name.lower() for r in current_user.roles] if current_user else []
    filtered = []
    for a in announcements:
        if a.audience == "ALL":
            filtered.append(a)
        elif a.audience == "PARTICIPANTS" and ("participant" in user_roles or "admin" in user_roles):
            filtered.append(a)
        elif a.audience == "VOLUNTEERS" and ("volunteer" in user_roles or "admin" in user_roles):
            filtered.append(a)

    return [
        AnnouncementResponse(
            id=a.id,
            title=a.title,
            body=a.body,
            priority=a.priority,
            audience=a.audience,
            publish_at=a.publish_at,
            expires_at=a.expires_at,
            is_published=a.is_published,
            created_at=a.created_at,
        )
        for a in filtered
    ]


@router.post("/", response_model=AnnouncementResponse, dependencies=[Depends(require_roles("admin"))])
async def create_announcement(
    data: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin creates and publishes an announcement."""
    now = datetime.now(timezone.utc)
    announcement = Announcement(
        title=data.title,
        body=data.body,
        priority=data.priority,
        audience=data.audience,
        publish_at=data.publish_at or now,
        expires_at=data.expires_at,
        is_published=True,
        created_by=current_user.id,
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    # Broadcast notification to clients
    await ws_manager.broadcast({
        "type": "announcement.published",
        "id": str(announcement.id),
        "title": announcement.title,
        "priority": announcement.priority,
    })

    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        priority=announcement.priority,
        audience=announcement.audience,
        publish_at=announcement.publish_at,
        expires_at=announcement.expires_at,
        is_published=announcement.is_published,
        created_at=announcement.created_at,
    )
