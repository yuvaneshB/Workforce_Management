"""Read-only workforce attendance, production, and dimensional analytics endpoints."""

import datetime as dt
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.attrition import AttritionAnalyticsResponse
from app.schemas.attendance import AttendanceAnalyticsResponse
from app.schemas.production import ProductionAnalyticsResponse
from app.schemas.workforce_analytics import (
    DepartmentAnalyticsResponse,
    ExperienceAnalyticsResponse,
    GenderAnalyticsResponse,
    NewJoinerAnalyticsResponse,
    SectionAnalyticsResponse,
    VendorAnalyticsResponse,
)
from app.services import (
    attendance_service,
    attrition_service,
    production_service,
    workforce_analytics_service,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/attendance",
    response_model=AttendanceAnalyticsResponse,
    summary="Get attendance analytics",
)
def get_attendance_analytics(
    period: Literal["daily", "weekly", "monthly"] = Query(
        default="daily",
        description="Aggregation period for attendance trend series",
    ),
    start_date: dt.date | None = Query(default=None, description="Inclusive start work_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end work_date (YYYY-MM-DD)"),
    employee_id: str | None = Query(default=None, description="Filter by employee_id"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    operator_team: str | None = Query(default=None, description="Filter by operator_team"),
    employment_type: str | None = Query(default=None, description="Filter by employment_type (Permanent, Vendor)"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    db: Session = Depends(get_readonly_db),
) -> AttendanceAnalyticsResponse:
    """Return attendance analytics, period trends, and data-quality warnings from Neon."""
    return attendance_service.get_attendance_analytics(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        operator_team=operator_team,
        employment_type=employment_type,
        vendor_id=vendor_id,
    )


@router.get(
    "/production",
    response_model=ProductionAnalyticsResponse,
    summary="Get production analytics",
)
def get_production_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start event_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end event_date (YYYY-MM-DD)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    line_id: str | None = Query(default=None, description="Filter by line_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    operator_team: str | None = Query(default=None, description="Filter by operator_team"),
    db: Session = Depends(get_readonly_db),
) -> ProductionAnalyticsResponse:
    """Return production quantity and downtime analytics from stored Neon records."""
    return production_service.get_production_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        line_id=line_id,
        shift_id=shift_id,
        operator_team=operator_team,
    )


@router.get("/gender", response_model=GenderAnalyticsResponse, summary="Get gender analytics")
def get_gender_analytics(
    start_date: dt.date | None = Query(default=None),
    end_date: dt.date | None = Query(default=None),
    shift_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> GenderAnalyticsResponse:
    return workforce_analytics_service.get_gender_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get(
    "/departments",
    response_model=DepartmentAnalyticsResponse,
    summary="Get department-wise analytics",
)
def get_department_analytics(
    start_date: dt.date | None = Query(default=None),
    end_date: dt.date | None = Query(default=None),
    shift_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> DepartmentAnalyticsResponse:
    return workforce_analytics_service.get_department_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get(
    "/experience",
    response_model=ExperienceAnalyticsResponse,
    summary="Get employee experience analytics",
)
def get_experience_analytics(
    start_date: dt.date | None = Query(default=None),
    end_date: dt.date | None = Query(default=None),
    shift_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> ExperienceAnalyticsResponse:
    return workforce_analytics_service.get_experience_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get(
    "/new-joiners",
    response_model=NewJoinerAnalyticsResponse,
    summary="Get new joiner analytics (12-month lookback from period start date)",
)
def get_new_joiner_analytics(
    period: Literal["daily", "weekly", "monthly"] = Query(default="weekly"),
    start_date: dt.date | None = Query(default=None),
    end_date: dt.date | None = Query(default=None),
    shift_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> NewJoinerAnalyticsResponse:
    return workforce_analytics_service.get_new_joiner_analytics(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get("/sections", response_model=SectionAnalyticsResponse, summary="Get section-wise analytics")
def get_section_analytics(
    start_date: dt.date | None = Query(default=None),
    end_date: dt.date | None = Query(default=None),
    shift_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> SectionAnalyticsResponse:
    return workforce_analytics_service.get_section_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get("/vendors", response_model=VendorAnalyticsResponse, summary="Get vendor-wise workforce distribution")
def get_vendor_analytics(
    plant_id: str | None = Query(default=None, description="Filter by plant_id (IN-TN-01, IN-KA-01)"),
    db: Session = Depends(get_readonly_db),
) -> VendorAnalyticsResponse:
    """Return distinct employee counts, active/assigned status, and shares across all staffing vendors."""
    return workforce_analytics_service.get_vendor_analytics(db, plant_id=plant_id)



@router.get("/overtime", summary="Get overtime analytics")
def get_overtime_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start work_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end work_date (YYYY-MM-DD)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    return workforce_analytics_service.get_overtime_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get("/team-production", summary="Get team production analytics")
def get_team_production_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start event_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end event_date (YYYY-MM-DD)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    operator_team: str | None = Query(default=None, description="Filter by operator_team (e.g. TEAM-01)"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    return workforce_analytics_service.get_team_production_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        shift_id=shift_id,
        operator_team=operator_team,
    )


@router.get("/shift-efficiency", summary="Get shift-wise production and workforce efficiency")
def get_shift_efficiency_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end date (YYYY-MM-DD)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    return workforce_analytics_service.get_shift_efficiency_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        shift_id=shift_id,
    )


@router.get("/skills", summary="Get skill matrix and certification analytics")
def get_skills_analytics(
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    team_id: str | None = Query(default=None, description="Filter by team_id"),
    shift_id: str | None = Query(default=None, description="Filter by home shift_id (A, B, C)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    return workforce_analytics_service.get_skills_analytics(
        db,
        department_id=department_id,
        section_id=section_id,
        team_id=team_id,
        shift_id=shift_id,
        plant_id=plant_id,
    )


@router.get("/compliance", summary="Get training compliance and skill match analytics")
def get_compliance_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start work_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end work_date (YYYY-MM-DD)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    return workforce_analytics_service.get_compliance_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )


@router.get(
    "/attrition",
    response_model=AttritionAnalyticsResponse,
    summary="Get workforce attrition analytics",
)
def get_attrition_analytics(
    start_date: dt.date | None = Query(default=None, description="Inclusive start resignation_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end resignation_date (YYYY-MM-DD)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id (IN-TN-01, IN-KA-01)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    db: Session = Depends(get_readonly_db),
) -> AttritionAnalyticsResponse:
    """Return workforce attrition summary, trends, reason distributions, and employee exits from Neon."""
    return attrition_service.get_attrition_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
    )


