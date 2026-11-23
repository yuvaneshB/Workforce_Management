"""SQLAlchemy ORM model for public.production_transactions."""

import datetime as dt
from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.core.database import Base


class HourlyProduction(Base):
    """Maps production_transactions.csv to public.production_transactions."""

    __tablename__ = "production_transactions"
    __table_args__ = (
        Index("ix_prd_date", "work_date"),
        Index("ix_prd_emp", "employee_id"),
        Index("ix_prd_plant_line", "plant_id", "line_id"),
        {"schema": "public"},
    )

    production_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    work_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    employee_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.employee_master.employee_id", name="fk_prd_employee"),
        nullable=False,
    )
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_prd_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_prd_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_prd_sec"),
        nullable=False,
    )
    line_id: Mapped[str] = mapped_column(String(32), nullable=False)
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_prd_shift"),
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    hours_worked: Mapped[float] = mapped_column(Float, nullable=False)
    target_units: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_units: Mapped[int] = mapped_column(Integer, nullable=False)
    good_units: Mapped[int] = mapped_column(Integer, nullable=False)
    rejected_units: Mapped[int] = mapped_column(Integer, nullable=False)
    rework_units: Mapped[int] = mapped_column(Integer, nullable=False)
    efficiency_pct: Mapped[float] = mapped_column(Float, nullable=False)
    first_pass_yield_pct: Mapped[float] = mapped_column(Float, nullable=False)
    downtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Column synonyms for queryable backwards-compatibility
    event_id = synonym("production_id")
    event_date = synonym("work_date")
    target_qty = synonym("target_units")
    actual_qty = synonym("actual_units")
    good_qty = synonym("good_units")
    reject_qty = synonym("rejected_units")
    rework_qty = synonym("rework_units")
    downtime_min = synonym("downtime_minutes")
    operator_team = synonym("section_id")

    @property
    def event_ts(self) -> dt.datetime:
        return dt.datetime.combine(self.work_date, dt.time.min)

    @property
    def year(self) -> int:
        return self.work_date.year

    @property
    def month(self) -> int:
        return self.work_date.month

    @property
    def week(self) -> int:
        return self.work_date.isocalendar()[1]

    @property
    def day(self) -> int:
        return self.work_date.day

    @property
    def hour(self) -> int:
        return 6

    @property
    def production_order_id(self) -> str:
        return self.production_id

    @property
    def downtime_reason(self) -> str:
        return ""

    @property
    def source_system(self) -> str:
        return "MES"

    @property
    def data_quality(self) -> str:
        return "GOOD"

