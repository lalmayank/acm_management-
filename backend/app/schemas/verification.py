import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class QRVerifyRequest(BaseModel):
    ticket_reference: str
    ticket_type_id: Optional[uuid.UUID] = None
    idempotency_key: Optional[str] = None


class VerificationResultResponse(BaseModel):
    outcome: str
    message: str
    participant_name: Optional[str] = None
    registration_code: Optional[str] = None
    team_name: Optional[str] = None
    ticket_name: Optional[str] = None
    allowed_uses: int = 1
    used_count: int = 1
    redeemed_at: Optional[datetime] = None


class BleSessionInitRequest(BaseModel):
    entitlement_id: uuid.UUID


class BleSessionResponse(BaseModel):
    session_token: str
    challenge_hash: str
    expires_at: datetime


class ScanAttemptResponse(BaseModel):
    id: uuid.UUID
    validator_name: str
    ticket_reference: str
    outcome: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
