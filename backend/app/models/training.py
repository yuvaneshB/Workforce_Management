"""SQLAlchemy ORM model for public.employee_training."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EmployeeTraining(Base):
    """Maps employee_training.csv to public.employee_training."""

    __tablename__ = "employee_training"
    __table_args__ = (
        Index("ix_trn_emp", "employee_id"),
        Index("ix_trn_cat", "training_category"),
        Index("ix_trn_status", "certification_status"),
        {"schema": "public"},
    )

    training_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_trn_employee"),
        nullable=False,
    )
    training_name: Mapped[str] = mapped_column(String(128), nullable=False)
    training_category: Mapped[str] = mapped_column(String(64), nullable=False)
    training_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    assessment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    result: Mapped[str | None] = mapped_column(String(32), nullable=True)
    certification_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    certificate_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    valid_from: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    valid_to: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    certification_status: Mapped[str] = mapped_column(String(32), nullable=False)
    is_mandatory: Mapped[str] = mapped_column(String(16), nullable=False)

