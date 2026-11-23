"""SQLAlchemy ORM models for public.department_master and public.employee_department_mapping."""

import datetime as dt
from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DepartmentMaster(Base):
    """Maps department_master.csv to public.department_master."""

    __tablename__ = "department_master"
    __table_args__ = ({"schema": "public"},)

    department_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    department_name: Mapped[str] = mapped_column(String(64), nullable=False)
    department_type: Mapped[str] = mapped_column(String(64), nullable=False)
    cost_centre: Mapped[str] = mapped_column(String(32), nullable=False)
    is_shift_based: Mapped[int] = mapped_column(Integer, nullable=False)


class EmployeeDepartmentMapping(Base):
    """Maps employee_department_mapping.csv to public.employee_department_mapping."""

    __tablename__ = "employee_department_mapping"
    __table_args__ = (
        Index("ix_edm_emp", "employee_id"),
        Index("ix_edm_dept", "department_id"),
        {"schema": "public"},
    )

    mapping_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_edm_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_edm_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_edm_dept"),
        nullable=False,
    )
    reporting_manager_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    effective_from: Mapped[dt.date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False)
