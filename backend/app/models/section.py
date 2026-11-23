"""SQLAlchemy ORM models for public.section_master and public.employee_section_mapping."""

import datetime as dt
from sqlalchemy import Boolean, Date, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SectionMaster(Base):
    """Maps section_master.csv to public.section_master."""

    __tablename__ = "section_master"
    __table_args__ = (
        Index("ix_section_master_dept", "department_id"),
        {"schema": "public"},
    )

    section_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    section_name: Mapped[str] = mapped_column(String(64), nullable=False)
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_section_dept"),
        nullable=False,
    )


class EmployeeSectionMapping(Base):
    """Maps employee_section_mapping.csv to public.employee_section_mapping."""

    __tablename__ = "employee_section_mapping"
    __table_args__ = (
        Index("ix_esm_emp", "employee_id"),
        Index("ix_esm_sec", "section_id"),
        {"schema": "public"},
    )

    mapping_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_esm_employee"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_esm_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_esm_sec"),
        nullable=False,
    )
    role_in_section: Mapped[str] = mapped_column(String(64), nullable=False)
    effective_from: Mapped[dt.date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False)
