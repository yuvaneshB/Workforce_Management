"""Service layer for attendance retrieval and analytics."""

import datetime as dt

from sqlalchemy.orm import Session

from app.repositories import attendance_repository
from app.schemas.attendance import (
    AttendanceAnalyticsResponse,
    AttendanceListResponse,
    AttendanceRecord,
    AttendanceStatusBreakdown,
    AttendanceTrendPoint,
    ShiftAttendanceBreakdown,
    VendorAttendanceBreakdown,
)
from app.schemas.common import GroupCount
from app.utils.query_helpers import (
    build_attendance_quality_warnings,
    build_pagination_meta,
    validate_date_range,
)


def list_attendance(
    db: Session,
    *,
    search: str | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    employee_id: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    attendance_status: str | None = None,
    skill_match: str | None = None,
    training_compliance: str | None = None,
    sort_by: str = "work_date",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> AttendanceListResponse:
    """Return paginated attendance records with separate data-quality warnings."""
    validate_date_range(start_date, end_date)
    items, total, quality_counts = attendance_repository.list_attendance(
        db,
        search=search,
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        attendance_status=attendance_status,
        skill_match=skill_match,
        training_compliance=training_compliance,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    records = [AttendanceRecord.model_validate(item) for item in items]
    return AttendanceListResponse(
        items=records,
        pagination=build_pagination_meta(
            total=total,
            limit=limit,
            offset=offset,
            returned=len(records),
        ),
        data_quality_warnings=build_attendance_quality_warnings(quality_counts),
    )


def get_attendance_analytics(
    db: Session,
    *,
    period: str = "daily",
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    employee_id: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    operator_team: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
) -> AttendanceAnalyticsResponse:
    """Return aggregated attendance analytics, trends, and separate data-quality warnings."""
    validate_date_range(start_date, end_date)
    raw = attendance_repository.get_attendance_analytics(
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
    return AttendanceAnalyticsResponse(
        period=raw["period"],
        total_records=raw["total_records"],
        distinct_employees=raw["distinct_employees"],
        total_scheduled_hours=raw["total_scheduled_hours"],
        total_actual_hours=raw["total_actual_hours"],
        total_overtime_hours=raw["total_overtime_hours"],
        present_count=raw.get("present_count", 0),
        absent_count=raw.get("absent_count", 0),
        leave_count=raw.get("leave_count", 0),
        late_count=raw.get("late_count", 0),
        attendance_rate=raw.get("attendance_rate", 0.0),
        absenteeism_rate=raw.get("absenteeism_rate", 0.0),
        by_status=[AttendanceStatusBreakdown(**item) for item in raw["by_status"]],
        by_plant=[GroupCount(key=k, count=c) for k, c in raw["by_plant"]],
        by_shift=[GroupCount(key=k, count=c) for k, c in raw["by_shift"]],
        by_skill_match=[GroupCount(key=k, count=c) for k, c in raw["by_skill_match"]],
        by_training_compliance=[
            GroupCount(key=k, count=c) for k, c in raw["by_training_compliance"]
        ],
        trends=[AttendanceTrendPoint(**pt) for pt in raw["trends"]],
        weekly_comparison=[AttendanceTrendPoint(**pt) for pt in raw["weekly_comparison"]],
        shift_breakdown=[ShiftAttendanceBreakdown(**sb) for sb in raw["shift_breakdown"]],
        by_vendor=[VendorAttendanceBreakdown(**v) for v in raw.get("by_vendor", [])],
        data_quality_warnings=build_attendance_quality_warnings(raw["quality_counts"]),
    )
