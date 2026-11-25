"""SQLAlchemy ORM model for public.hr_approval_records."""

import datetime as dt
from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class HrApprovalRecord(Base):
    """Centralized HR Approval and Governance record for all 7 specialist agents."""

    __tablename__ = "hr_approval_records"
    __table_args__ = (
        Index("ix_apv_exec", "execution_id"),
        Index("ix_apv_agent", "specialist_agent"),
        Index("ix_apv_status", "approval_status"),
        Index("ix_apv_review", "review_status"),
        {"schema": "public"},
    )

    approval_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    execution_id: Mapped[str] = mapped_column(String(64), nullable=False)
    specialist_agent: Mapped[str] = mapped_column(String(64), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(128), nullable=False)
    plant_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)

    # Review tracking
    review_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING_REVIEW")  # PENDING_REVIEW | REVIEWED
    reviewed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Approval decision tracking
    approval_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED
    approved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    decision_date: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Full execution findings JSON payload for View Details drawer
    result_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

