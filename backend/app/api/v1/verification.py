import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.ticket import ScanAttempt, TicketType, TicketEntitlement
from app.models.verification import BleSession
from app.schemas.verification import (
    QRVerifyRequest,
    VerificationResultResponse,
    BleSessionInitRequest,
    BleSessionResponse,
    ScanAttemptResponse,
)
from app.services.ticket_redemption import redeem_ticket
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/verification", tags=["Verification"])


@router.post("/qr", response_model=VerificationResultResponse)
async def verify_and_redeem_qr(
    data: QRVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("volunteer", "admin")),
):
    """
    Validate and redeem a presented ticket (QR code reference or BLE code).
    Applies concurrency protection and permissions checks.
    """
    result = await redeem_ticket(
        db=db,
        validator_id=current_user.id,
        ticket_reference=data.ticket_reference,
        target_ticket_type_id=data.ticket_type_id,
        idempotency_key=data.idempotency_key,
    )
    return VerificationResultResponse(**result)


@router.post("/sessions", response_model=BleSessionResponse)
async def create_ble_session(
    data: BleSessionInitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Participant initiates a short-lived BLE verification session challenge (valid for 60 seconds).
    """
    ent = await db.get(TicketEntitlement, data.entitlement_id)
    if not ent:
        raise HTTPException(status_code=404, detail="Entitlement not found")

    session_token = f"ble_{uuid.uuid4().hex}"
    challenge_hash = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=60)

    ble_session = BleSession(
        session_token=session_token,
        participant_id=ent.participant_id,
        entitlement_id=ent.id,
        challenge_hash=challenge_hash,
        expires_at=expires_at,
    )
    db.add(ble_session)
    await db.commit()

    return BleSessionResponse(
        session_token=session_token,
        challenge_hash=challenge_hash,
        expires_at=expires_at,
    )


@router.get("/attempts", response_model=List[ScanAttemptResponse])
async def list_scan_attempts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("volunteer", "admin")),
):
    """List recent scan attempts for audit."""
    user_roles = [r.name.lower() for r in current_user.roles]
    stmt = (
        select(ScanAttempt)
        .options(selectinload(ScanAttempt.validator))
        .order_by(ScanAttempt.created_at.desc())
        .limit(100)
    )
    # If volunteer without admin, show own scan attempts
    if "admin" not in user_roles:
        stmt = stmt.where(ScanAttempt.validator_id == current_user.id)

    res = await db.execute(stmt)
    attempts = res.scalars().all()

    return [
        ScanAttemptResponse(
            id=a.id,
            validator_name=a.validator.name if a.validator else "Validator",
            ticket_reference=a.ticket_reference,
            outcome=a.outcome,
            reason=a.reason,
            created_at=a.created_at,
        )
        for a in attempts
    ]
