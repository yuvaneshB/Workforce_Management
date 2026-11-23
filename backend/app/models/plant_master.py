"""SQLAlchemy ORM model for public.plant_master."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PlantMaster(Base):
    """Maps plant_master.csv to public.plant_master."""

    __tablename__ = "plant_master"
    __table_args__ = ({"schema": "public"},)

    plant_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    plant_name: Mapped[str] = mapped_column(String(128), nullable=False)
    city: Mapped[str] = mapped_column(String(64), nullable=False)
    state: Mapped[str] = mapped_column(String(64), nullable=False)
    country: Mapped[str] = mapped_column(String(64), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    established_year: Mapped[int] = mapped_column(Integer, nullable=False)
    plant_type: Mapped[str] = mapped_column(String(64), nullable=False)
    total_headcount_budget: Mapped[int] = mapped_column(Integer, nullable=False)

