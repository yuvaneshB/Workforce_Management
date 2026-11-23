"""SQLAlchemy ORM model for public.overtime_transactions."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OvertimeTransaction(Base):
    """Maps overtime_transactions.csv to public.overtime_transactions."""

    __tablename__ = "overtime_transactions"
    __table_args__ = (
        Index("ix_ot_date", "work_date"),
        Index("ix_ot_emp", "employee_id"),
        Index("ix_ot_dept", "department_id"),
        {"schema": "public"},
    )

    overtime_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    work_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_ot_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_ot_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_ot_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_ot_sec"),
        nullable=False,
    )
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_ot_shift"),
        nullable=False,
    )
    employment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    ot_type: Mapped[str] = mapped_column(String(32), nullable=False)
    ot_hours: Mapped[float] = mapped_column(Float, nullable=False)
    base_hourly_rate_inr: Mapped[float] = mapped_column(Float, nullable=False)
    ot_rate_multiplier: Mapped[float] = mapped_column(Float, nullable=False)
    ot_cost_inr: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(String(128), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    approval_status: Mapped[str] = mapped_column(String(32), nullable=False)

