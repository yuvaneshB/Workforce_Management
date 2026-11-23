"""SQLAlchemy ORM model for public.attendance_transactions."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkforceAttendance(Base):
    """Maps attendance_transactions.csv to public.attendance_transactions."""

    __tablename__ = "attendance_transactions"
    __table_args__ = (
        Index("ix_att_date_plant", "work_date", "plant_id"),
        Index("ix_att_emp_date", "employee_id", "work_date"),
        Index("ix_att_dept_shift", "department_id", "shift_id"),
        Index("ix_att_status", "attendance_status"),
        {"schema": "public"},
    )

    attendance_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    work_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_att_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_att_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_att_dept"),
        nullable=False,
    )
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_att_shift"),
        nullable=False,
    )
    employment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    day_type: Mapped[str] = mapped_column(String(32), nullable=False)
    attendance_status: Mapped[str] = mapped_column(String(32), nullable=False)
    leave_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    scheduled_hours: Mapped[float] = mapped_column(Float, nullable=False)
    actual_hours: Mapped[float] = mapped_column(Float, nullable=False)
    in_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    out_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    late_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(Float, nullable=False)

    @property
    def skill_match(self) -> str:
        return "MATCH"

    @property
    def training_compliance(self) -> str:
        return "COMPLIANT"

