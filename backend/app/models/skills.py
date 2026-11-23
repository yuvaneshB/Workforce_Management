"""SQLAlchemy ORM model for public.employee_skill_mapping."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EmployeeSkillMapping(Base):
    """Maps employee_skill_mapping.csv to public.employee_skill_mapping."""

    __tablename__ = "employee_skill_mapping"
    __table_args__ = (
        Index("ix_esk_emp", "employee_id"),
        Index("ix_esk_skill", "skill_name"),
        Index("ix_esk_level", "proficiency_level"),
        {"schema": "public"},
    )

    mapping_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_esk_employee"),
        nullable=False,
    )
    skill_name: Mapped[str] = mapped_column(String(64), nullable=False)
    skill_type: Mapped[str] = mapped_column(String(32), nullable=False)
    proficiency_level: Mapped[str] = mapped_column(String(16), nullable=False)
    years_experience: Mapped[float] = mapped_column(Float, nullable=False)
    certification: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_assessed_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

