import uuid
from typing import Optional, List
from sqlalchemy import String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    team_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    project_title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    leader_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    presentation_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    members: Mapped[List["TeamMember"]] = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    allocations: Mapped[List["TeamTicketAllocation"]] = relationship("TeamTicketAllocation", back_populates="team", cascade="all, delete-orphan")
    presentations: Mapped[List["Presentation"]] = relationship("Presentation", back_populates="team")


class TeamMember(Base, TimestampMixin):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "participant_id", name="uq_team_participant"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, REMOVED

    team: Mapped["Team"] = relationship("Team", back_populates="members")
    participant: Mapped["Participant"] = relationship("Participant", back_populates="team_memberships")
