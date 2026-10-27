import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class TicketTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "GENERAL"  # GENERAL, FOOD, ENTRY, WORKSHOP, PITCH
    rules: Optional[Dict[str, Any]] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    allowed_uses_per_member: int = 1
    allowed_validation_roles: List[str] = ["volunteer", "admin"]


class TicketTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    valid_until: Optional[datetime] = None


class TicketTypeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    category: str
    valid_from: datetime
    valid_until: Optional[datetime] = None
    is_active: bool
    allowed_uses_per_member: int
    total_entitlements: int = 0
    total_redeemed: int = 0
    total_pending: int = 0

    class Config:
        from_attributes = True


class TicketIssuanceRequest(BaseModel):
    team_ids: List[uuid.UUID] = []
    participant_ids: List[uuid.UUID] = []
    quantity_per_member: int = 1
    idempotency_key: Optional[str] = None


class TicketEntitlementResponse(BaseModel):
    id: uuid.UUID
    ticket_type_id: uuid.UUID
    ticket_name: str
    category: str
    description: Optional[str] = None
    allowed_uses: int
    used_count: int
    status: str
    secret_code: str
    valid_from: datetime
    valid_until: Optional[datetime] = None
    team_name: Optional[str] = None

    class Config:
        from_attributes = True


class MemberEntitlementStatusResponse(BaseModel):
    participant_id: uuid.UUID
    name: str
    registration_code: str
    entitlement_id: Optional[uuid.UUID] = None
    status: str
    allowed_uses: int
    used_count: int
    last_redeemed_at: Optional[datetime] = None
    validator_name: Optional[str] = None


class TeamTicketStatusResponse(BaseModel):
    team_id: uuid.UUID
    team_name: str
    team_code: str
    total_members: int
    redeemed_count: int
    pending_count: int
    members: List[MemberEntitlementStatusResponse] = []
