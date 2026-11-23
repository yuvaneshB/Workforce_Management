"""Service layer for gender, department, experience, new joiner, and section analytics."""

import datetime as dt

from sqlalchemy.orm import Session

from app.repositories import workforce_analytics_repository
from app.schemas.workforce_analytics import (
    DepartmentAnalyticsItem,
    DepartmentAnalyticsResponse,
    ExperienceAnalyticsItem,
    ExperienceAnalyticsResponse,
    GenderAnalyticsResponse,
    GenderBucket,
    NewJoinerAnalyticsResponse,
    NewJoinerTrendPoint,
    SectionAnalyticsItem,
    SectionAnalyticsResponse,
    VendorAnalyticsItem,
    VendorAnalyticsResponse,
)
from app.utils.query_helpers import validate_date_range


def get_gender_analytics(db: Session, *, start_date: dt.date | None = None, end_date: dt.date | None = None, **kwargs) -> GenderAnalyticsResponse:
    validate_date_range(start_date, end_date)
    raw = workforce_analytics_repository.get_gender_analytics(
        db, start_date=start_date, end_date=end_date, **kwargs
    )
    return GenderAnalyticsResponse(
        total_employees=raw["total_employees"],
        buckets=[GenderBucket(**b) for b in raw["buckets"]],
    )


def get_department_analytics(db: Session, *, start_date: dt.date | None = None, end_date: dt.date | None = None, **kwargs) -> DepartmentAnalyticsResponse:
    validate_date_range(start_date, end_date)
    raw = workforce_analytics_repository.get_department_analytics(
        db, start_date=start_date, end_date=end_date, **kwargs
    )
    return DepartmentAnalyticsResponse(
        total_departments=raw["total_departments"],
        items=[DepartmentAnalyticsItem(**i) for i in raw["items"]],
    )


def get_experience_analytics(db: Session, *, start_date: dt.date | None = None, end_date: dt.date | None = None, **kwargs) -> ExperienceAnalyticsResponse:
    validate_date_range(start_date, end_date)
    raw = workforce_analytics_repository.get_experience_analytics(
        db, start_date=start_date, end_date=end_date, **kwargs
    )
    return ExperienceAnalyticsResponse(
        items=[ExperienceAnalyticsItem(**i) for i in raw["items"]],
    )


def get_new_joiner_analytics(db: Session, *, start_date: dt.date | None = None, end_date: dt.date | None = None, **kwargs) -> NewJoinerAnalyticsResponse:
    validate_date_range(start_date, end_date)
    raw = workforce_analytics_repository.get_new_joiner_analytics(
        db, start_date=start_date, end_date=end_date, **kwargs
    )
    return NewJoinerAnalyticsResponse(
        anchor_date=raw["anchor_date"],
        lookback_start=raw["lookback_start"],
        total_new_joiners=raw["total_new_joiners"],
        avg_tenure_months=raw["avg_tenure_months"],
        total_records=raw["total_records"],
        present_count=raw["present_count"],
        absent_count=raw["absent_count"],
        attendance_pct=raw["attendance_pct"],
        absenteeism_pct=raw["absenteeism_pct"],
        trends=[NewJoinerTrendPoint(**pt) for pt in raw["trends"]],
    )


def get_section_analytics(db: Session, *, start_date: dt.date | None = None, end_date: dt.date | None = None, **kwargs) -> SectionAnalyticsResponse:
    validate_date_range(start_date, end_date)
    raw = workforce_analytics_repository.get_section_analytics(
        db, start_date=start_date, end_date=end_date, **kwargs
    )
    return SectionAnalyticsResponse(
        total_sections=raw["total_sections"],
        items=[SectionAnalyticsItem(**i) for i in raw["items"]],
    )


def get_vendor_analytics(db: Session, *, plant_id: str | None = None) -> VendorAnalyticsResponse:
    raw = workforce_analytics_repository.get_vendor_analytics(db, plant_id=plant_id)
    return VendorAnalyticsResponse(
        total_vendors=raw["total_vendors"],
        total_vendor_workforce=raw["total_vendor_workforce"],
        total_active_vendor_workforce=raw["total_active_vendor_workforce"],
        total_permanent_workforce=raw["total_permanent_workforce"],
        total_workforce=raw["total_workforce"],
        items=[VendorAnalyticsItem(**i) for i in raw["items"]],
    )



def get_overtime_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    validate_date_range(start_date, end_date)
    return workforce_analytics_repository.get_overtime_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


def get_team_production_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    operator_team: str | None = None,
) -> dict:
    validate_date_range(start_date, end_date)
    return workforce_analytics_repository.get_team_production_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        shift_id=shift_id,
        operator_team=operator_team,
    )


def get_shift_efficiency_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict:
    validate_date_range(start_date, end_date)
    return workforce_analytics_repository.get_shift_efficiency_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        shift_id=shift_id,
    )


def get_skills_analytics(
    db: Session,
    *,
    department_id: str | None = None,
    section_id: str | None = None,
    team_id: str | None = None,
    shift_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    return workforce_analytics_repository.get_skills_analytics(
        db,
        department_id=department_id,
        section_id=section_id,
        team_id=team_id,
        shift_id=shift_id,
        plant_id=plant_id,
    )


def get_compliance_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    validate_date_range(start_date, end_date)
    return workforce_analytics_repository.get_compliance_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


