"""SQLAlchemy ORM model for public.attrition_transactions."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AttritionTransaction(Base):
    """Maps attrition_transactions.csv to public.attrition_transactions."""

    __tablename__ = "attrition_transactions"
    __table_args__ = (
        Index("ix_atr_emp", "employee_id"),
        Index("ix_atr_dept", "department_id"),
        {"schema": "public"},
    )

    attrition_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_atr_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_atr_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_atr_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_atr_sec"),
        nullable=False,
    )
    employment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    vendor_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("public.vendor_master.vendor_id", name="fk_atr_vendor"),
        nullable=True,
    )
    designation: Mapped[str] = mapped_column(String(64), nullable=False)
    grade: Mapped[str] = mapped_column(String(16), nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    date_of_joining: Mapped[dt.date] = mapped_column(Date, nullable=False)
    resignation_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    last_working_day: Mapped[dt.date] = mapped_column(Date, nullable=False)
    notice_period_days: Mapped[int] = mapped_column(Integer, nullable=False)
    tenure_months: Mapped[float] = mapped_column(Float, nullable=False)
    exit_type: Mapped[str] = mapped_column(String(32), nullable=False)
    exit_reason: Mapped[str] = mapped_column(String(64), nullable=False)
    regrettable_loss: Mapped[str] = mapped_column(String(16), nullable=False)
    exit_interview_done: Mapped[str] = mapped_column(String(16), nullable=False)
    rehire_eligible: Mapped[str] = mapped_column(String(16), nullable=False)
    destination: Mapped[str] = mapped_column(String(128), nullable=False)
    last_drawn_monthly_inr: Mapped[float] = mapped_column(Float, nullable=False)

