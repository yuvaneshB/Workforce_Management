"""Service layer for workforce attrition analytics."""

import datetime as dt
from sqlalchemy.orm import Session

from app.repositories import attrition_repository
from app.schemas.attrition import AttritionAnalyticsResponse


def get_attrition_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    shift_id: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
    team_id: str | None = None,
) -> AttritionAnalyticsResponse:
    """Return comprehensive attrition analytics derived from public.attrition_transactions."""
    data = attrition_repository.get_attrition_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
        shift_id=shift_id,
        employment_type=employment_type,
        vendor_id=vendor_id,
        team_id=team_id,
    )
    return AttritionAnalyticsResponse(**data)

