import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PresentationCreate(BaseModel):
    team_id: uuid.UUID
    position: int
    scheduled_start: Optional[datetime] = None
    organizer_notes: Optional[str] = None


class PresentationUpdate(BaseModel):
    position: Optional[int] = None
    scheduled_start: Optional[datetime] = None
    status: Optional[str] = None
    organizer_notes: Optional[str] = None


class PresentationResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    team_name: str
    project_title: str
    position: int
    scheduled_start: Optional[datetime] = None
    status: str
    organizer_notes: Optional[str] = None

    class Config:
        from_attributes = True


class StageTransitionRequest(BaseModel):
    target_presentation_id: Optional[uuid.UUID] = None
    action: str  # NEXT, ACTIVATE, COMPLETE, DELAY, RESET


class StageStateResponse(BaseModel):
    current_presentation: Optional[PresentationResponse] = None
    upcoming_presentations: List[PresentationResponse] = []
    version: int
    last_updated: datetime
