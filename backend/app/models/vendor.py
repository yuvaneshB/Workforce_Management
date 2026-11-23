"""SQLAlchemy ORM models for public.vendor_master and public.employee_vendor_mapping."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VendorMaster(Base):
    """Maps vendor_master.csv to public.vendor_master."""

    __tablename__ = "vendor_master"
    __table_args__ = ({"schema": "public"},)

    vendor_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    vendor_name: Mapped[str] = mapped_column(String(128), nullable=False)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(128), nullable=True)
    service_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    performance_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    payment_terms_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contract_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    contract_end: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    contract_status: Mapped[str | None] = mapped_column(String(32), nullable=True)


class EmployeeVendorMapping(Base):
    """Maps employee_vendor_mapping.csv to public.employee_vendor_mapping."""

    __tablename__ = "employee_vendor_mapping"
    __table_args__ = (
        Index("ix_evm_emp", "employee_id"),
        Index("ix_evm_vendor", "vendor_id"),
        {"schema": "public"},
    )

    mapping_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_evm_employee"),
        nullable=False,
    )
    vendor_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.vendor_master.vendor_id", name="fk_evm_vendor"),
        nullable=False,
    )
    vendor_employee_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    engagement_start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    contract_end_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    contract_type: Mapped[str] = mapped_column(String(32), nullable=False)
    billing_rate_per_day_inr: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
