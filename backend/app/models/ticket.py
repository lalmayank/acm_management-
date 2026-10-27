import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin
from app.core.permissions import TicketStatusEnum, ScanOutcomeEnum


class TicketType(Base, TimestampMixin):
    __tablename__ = "ticket_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="GENERAL", nullable=False)  # ENTRY, FOOD, WORKSHOP, PITCH
    rules: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allowed_uses_per_member: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    allocations: Mapped[List["TeamTicketAllocation"]] = relationship("TeamTicketAllocation", back_populates="ticket_type", cascade="all, delete-orphan")
    entitlements: Mapped[List["TicketEntitlement"]] = relationship("TicketEntitlement", back_populates="ticket_type")
    validator_permissions: Mapped[List["ValidatorPermission"]] = relationship("ValidatorPermission", back_populates="ticket_type", cascade="all, delete-orphan")


class TeamTicketAllocation(Base, TimestampMixin):
    __tablename__ = "team_ticket_allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="CASCADE"), nullable=False)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    quantity_per_member: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    ticket_type: Mapped["TicketType"] = relationship("TicketType", back_populates="allocations")
    team: Mapped["Team"] = relationship("Team", back_populates="allocations")
    entitlements: Mapped[List["TicketEntitlement"]] = relationship("TicketEntitlement", back_populates="allocation", cascade="all, delete-orphan")


class TicketEntitlement(Base, TimestampMixin):
    __tablename__ = "ticket_entitlements"
    __table_args__ = (
        UniqueConstraint("allocation_id", "participant_id", name="uq_allocation_participant"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="CASCADE"), nullable=False)
    allocation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("team_ticket_allocations.id", ondelete="CASCADE"), nullable=True)
    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    allowed_uses: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=TicketStatusEnum.AVAILABLE.value, nullable=False)
    secret_code: Mapped[str] = mapped_column(String(64), default=lambda: uuid.uuid4().hex, unique=True, index=True, nullable=False)

    ticket_type: Mapped["TicketType"] = relationship("TicketType", back_populates="entitlements")
    allocation: Mapped[Optional["TeamTicketAllocation"]] = relationship("TeamTicketAllocation", back_populates="entitlements")
    participant: Mapped["Participant"] = relationship("Participant", back_populates="ticket_entitlements")
    redemptions: Mapped[List["TicketRedemption"]] = relationship("TicketRedemption", back_populates="entitlement", cascade="all, delete-orphan")


class TicketRedemption(Base, TimestampMixin):
    __tablename__ = "ticket_redemptions"
    __table_args__ = (
        UniqueConstraint("entitlement_id", "use_number", name="uq_entitlement_use_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entitlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ticket_entitlements.id", ondelete="CASCADE"), nullable=False)
    use_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    validator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)

    entitlement: Mapped["TicketEntitlement"] = relationship("TicketEntitlement", back_populates="redemptions")
    validator: Mapped["User"] = relationship("User")


class ScanAttempt(Base, TimestampMixin):
    __tablename__ = "scan_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    validator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    ticket_reference: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    outcome: Mapped[str] = mapped_column(String(50), default=ScanOutcomeEnum.VALID.value, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    validator: Mapped["User"] = relationship("User")


class ValidatorPermission(Base, TimestampMixin):
    __tablename__ = "validator_permissions"
    __table_args__ = (
        UniqueConstraint("user_id", "ticket_type_id", name="uq_validator_ticket_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="CASCADE"), nullable=False)
    allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship("User")
    ticket_type: Mapped["TicketType"] = relationship("TicketType", back_populates="validator_permissions")
