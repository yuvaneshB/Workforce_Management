"""SQLAlchemy ORM model for public.shift_master."""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShiftMaster(Base):
    """Maps shift_master.csv to public.shift_master."""

    __tablename__ = "shift_master"
    __table_args__ = ({"schema": "public"},)

    shift_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    shift_name: Mapped[str] = mapped_column(String(32), nullable=False)
    start_time: Mapped[str] = mapped_column(String(16), nullable=False)
    end_time: Mapped[str] = mapped_column(String(16), nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    night_allowance_applicable: Mapped[int] = mapped_column(Integer, nullable=False)
    night_allowance_inr_per_shift: Mapped[float] = mapped_column(Float, nullable=False)

