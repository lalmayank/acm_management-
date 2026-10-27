import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin
from app.core.permissions import PresentationStatusEnum


class Presentation(Base, TimestampMixin):
    __tablename__ = "presentations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=PresentationStatusEnum.UPCOMING.value, nullable=False)
    organizer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    team: Mapped["Team"] = relationship("Team", back_populates="presentations")


class StageState(Base, TimestampMixin):
    __tablename__ = "stage_state"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default="default_stage")
    current_presentation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id", ondelete="SET NULL"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    current_presentation: Mapped[Optional["Presentation"]] = relationship("Presentation")


class StageHistory(Base, TimestampMixin):
    __tablename__ = "stage_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    previous_presentation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id", ondelete="SET NULL"), nullable=True)
    new_presentation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id", ondelete="SET NULL"), nullable=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    actor: Mapped["User"] = relationship("User")
    previous_presentation: Mapped[Optional["Presentation"]] = relationship("Presentation", foreign_keys=[previous_presentation_id])
    new_presentation: Mapped[Optional["Presentation"]] = relationship("Presentation", foreign_keys=[new_presentation_id])
