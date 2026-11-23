"""SQLAlchemy ORM model for public.employee_experience."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.core.database import Base


class EmployeeExperience(Base):
    """Maps employee_experience.csv to public.employee_experience."""

    __tablename__ = "employee_experience"
    __table_args__ = (
        Index("ix_exp_emp", "employee_id"),
        {"schema": "public"},
    )

    experience_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_exp_employee"),
        nullable=False,
    )
    date_of_joining: Mapped[dt.date] = mapped_column(Date, nullable=False)
    highest_education: Mapped[str | None] = mapped_column(String(64), nullable=True)
    previous_industry: Mapped[str | None] = mapped_column(String(128), nullable=True)
    previous_company_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    previous_experience_years: Mapped[float] = mapped_column(Float, nullable=False)
    experience_in_company_years: Mapped[float] = mapped_column(Float, nullable=False)
    total_experience_years: Mapped[float] = mapped_column(Float, nullable=False)
    experience_band: Mapped[str] = mapped_column(String(32), nullable=False)
    probation_completed: Mapped[str] = mapped_column(String(16), nullable=False)

    # Synonyms for backward compatibility
    experience_years = synonym("total_experience_years")
    experience_months = synonym("experience_in_company_years")
