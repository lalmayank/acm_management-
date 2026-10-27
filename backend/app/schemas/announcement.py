import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    audience: str = "ALL"  # ALL, PARTICIPANTS, VOLUNTEERS
    publish_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None
    audience: Optional[str] = None
    is_published: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    priority: str
    audience: str
    publish_at: datetime
    expires_at: Optional[datetime] = None
    is_published: bool
    created_at: datetime
    is_read: bool = False

    class Config:
        from_attributes = True
