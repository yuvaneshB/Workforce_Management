"""SQLAlchemy ORM model for public.employee_master."""

import datetime as dt
from sqlalchemy import Date, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.core.database import Base


class EmployeeMaster(Base):
    """Maps employee_master.csv to public.employee_master."""

    __tablename__ = "employee_master"
    __table_args__ = (
        Index("ix_employee_plant", "plant_id"),
        Index("ix_employee_dept", "department_id"),
        Index("ix_employee_section", "section_id"),
        Index("ix_employee_shift", "shift_id"),
        Index("ix_employee_status", "employment_status"),
        {"schema": "public"},
    )

    employee_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(64), nullable=False)
    last_name: Mapped[str] = mapped_column(String(64), nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    date_of_birth: Mapped[dt.date] = mapped_column(Date, nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    marital_status: Mapped[str] = mapped_column(String(32), nullable=False)
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_employee_plant"),
        nullable=False,
    )
    residence_city: Mapped[str] = mapped_column(String(64), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    vendor_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("public.vendor_master.vendor_id", name="fk_employee_vendor"),
        nullable=True,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_employee_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_employee_sec"),
        nullable=False,
    )
    designation: Mapped[str] = mapped_column(String(64), nullable=False)
    grade: Mapped[str] = mapped_column(String(16), nullable=False)
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_employee_shift"),
        nullable=False,
    )
    date_of_joining: Mapped[dt.date] = mapped_column(Date, nullable=False)
    employment_status: Mapped[str] = mapped_column(String(32), nullable=False)
    exit_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    # Column synonyms for backward-compatibility with old queries
    employee_name = synonym("full_name")
    role = synonym("designation")
    skill_grade = synonym("grade")
    home_shift = synonym("shift_id")
    active_status = synonym("employment_status")
    hire_date = synonym("date_of_joining")
    team_id = synonym("section_id")

    @property
    def certification(self) -> str:
        return ""

