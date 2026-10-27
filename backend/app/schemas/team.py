import uuid
from typing import Optional, List
from pydantic import BaseModel


class MemberInput(BaseModel):
    name: str
    email: str
    college: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    name: str
    email: str
    registration_code: str
    college: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    name: str
    team_code: Optional[str] = None
    college: Optional[str] = None
    project_title: Optional[str] = None
    description: Optional[str] = None
    leader_registration_code: Optional[str] = None
    member_registration_codes: Optional[List[str]] = []
    members_data: Optional[List[MemberInput]] = []


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    project_title: Optional[str] = None
    description: Optional[str] = None
    presentation_order: Optional[int] = None


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    team_code: str
    project_title: str
    description: Optional[str] = None
    college: Optional[str] = None
    leader_id: Optional[uuid.UUID] = None
    leader_name: Optional[str] = None
    presentation_order: Optional[int] = None
    members: List[TeamMemberResponse] = []

    class Config:
        from_attributes = True


class TeamCSVImportResult(BaseModel):
    total_rows: int
    teams_created: int
    members_created: int
    errors: List[str]
