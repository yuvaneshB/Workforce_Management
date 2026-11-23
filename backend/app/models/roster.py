"""SQLAlchemy ORM model for public.employee_shift_roster."""

import datetime as dt
from sqlalchemy import Date, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EmployeeShiftRoster(Base):
    """Maps employee_shift_roster.csv to public.employee_shift_roster."""

    __tablename__ = "employee_shift_roster"
    __table_args__ = (
        Index("ix_roster_emp", "employee_id"),
        Index("ix_roster_week", "week_start", "week_end"),
        Index("ix_roster_shift", "shift_id"),
        {"schema": "public"},
    )

    roster_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_roster_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_roster_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_roster_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_roster_sec"),
        nullable=False,
    )
    week_start: Mapped[dt.date] = mapped_column(Date, nullable=False)
    week_end: Mapped[dt.date] = mapped_column(Date, nullable=False)
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_roster_shift"),
        nullable=False,
    )
    weekly_off_day: Mapped[str] = mapped_column(String(16), nullable=False)
    roster_type: Mapped[str] = mapped_column(String(32), nullable=False)

