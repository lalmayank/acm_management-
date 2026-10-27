import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class ParticipantCreate(BaseModel):
    name: str
    email: EmailStr
    registration_code: str
    phone: Optional[str] = None
    college: Optional[str] = None
    password: Optional[str] = "participant123"


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    is_active: Optional[bool] = None


class ParticipantResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str
    registration_code: str
    phone: Optional[str] = None
    college: Optional[str] = None
    team_name: Optional[str] = None
    team_id: Optional[uuid.UUID] = None
    is_active: bool

    class Config:
        from_attributes = True


class CSVImportResult(BaseModel):
    total_processed: int
    created: int
    updated: int
    errors: List[str] = []
