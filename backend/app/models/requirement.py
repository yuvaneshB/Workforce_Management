"""SQLAlchemy ORM model for public.workforce_requirement."""

from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkforceRequirement(Base):
    """Maps workforce_requirement.csv to public.workforce_requirement."""

    __tablename__ = "workforce_requirement"
    __table_args__ = (
        Index("ix_req_plant_month", "plant_id", "month"),
        Index("ix_req_dept_sec", "department_id", "section_id"),
        {"schema": "public"},
    )

    requirement_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    month: Mapped[str] = mapped_column(String(16), nullable=False)
    plant_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.plant_master.plant_id", name="fk_req_plant"),
        nullable=False,
    )
    department_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.department_master.department_id", name="fk_req_dept"),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("public.section_master.section_id", name="fk_req_sec"),
        nullable=False,
    )
    section_name: Mapped[str] = mapped_column(String(64), nullable=False)
    shift_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("public.shift_master.shift_id", name="fk_req_shift"),
        nullable=False,
    )
    required_headcount: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_headcount: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_permanent: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_vendor: Mapped[int] = mapped_column(Integer, nullable=False)
    gap: Mapped[int] = mapped_column(Integer, nullable=False)
    fill_rate_pct: Mapped[float] = mapped_column(Float, nullable=False)
    required_skilled_l3_plus: Mapped[int] = mapped_column("required_skilled_l3_plus", Integer, nullable=False)

    @property
    def required_skilled_L3_plus(self) -> int:
        return self.required_skilled_l3_plus
    gap_status: Mapped[str] = mapped_column(String(32), nullable=False)

