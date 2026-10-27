import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    instructions: str
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    due_at: Optional[datetime] = None
    organizer_notes: Optional[str] = None
    assigned_user_ids: List[uuid.UUID] = []


class TaskStatusUpdate(BaseModel):
    status: str  # PENDING, IN_PROGRESS, COMPLETED, BLOCKED
    notes: Optional[str] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    instructions: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    organizer_notes: Optional[str] = None
    assigned_volunteers: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True
