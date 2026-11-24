"""Pydantic v2 schemas for fact_workforce_attendance and attendance analytics."""

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.common import DataQualityWarning, GroupCount, PaginationMeta


class AttendanceRecord(BaseModel):
    """Serialized row from public.fact_workforce_attendance (enriched with name & department)."""

    model_config = ConfigDict(from_attributes=True)

    attendance_id: str
    work_date: dt.date
    employee_id: str
    employee_name: str | None = None
    department: str | None = None
    plant_id: str
    shift_id: str
    scheduled_hours: float
    actual_hours: float
    attendance_status: str
    overtime_hours: float
    skill_match: str | None = "MATCH"
    training_compliance: str | None = "COMPLIANT"


class AttendanceListResponse(BaseModel):
    """Paginated response for GET /api/v1/attendance."""

    items: list[AttendanceRecord]
    pagination: PaginationMeta
    data_quality_warnings: list[DataQualityWarning]


class AttendanceStatusBreakdown(BaseModel):
    """Aggregated attendance metrics grouped by attendance_status."""

    attendance_status: str
    record_count: int
    scheduled_hours: int
    actual_hours: int
    overtime_hours: int


class AttendanceTrendPoint(BaseModel):
    """Aggregated attendance & absenteeism rates for a daily, weekly, or monthly bucket."""

    period_key: str
    label: str
    total_records: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    attendance_pct: float
    absenteeism_pct: float
    male_present_count: int = 0
    female_present_count: int = 0
    male_absent_count: int = 0
    female_absent_count: int = 0


class ShiftAttendanceBreakdown(BaseModel):
    """Per-shift attendance status counts and percentages."""

    shift_id: str
    total_records: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    attendance_pct: float
    absenteeism_pct: float


class AttendanceAnalyticsResponse(BaseModel):
    """Aggregated attendance analytics derived directly from Neon database records."""

    period: str = "daily"
    total_records: int
    distinct_employees: int
    total_scheduled_hours: int
    total_actual_hours: int
    total_overtime_hours: int
    present_count: int = 0
    absent_count: int = 0
    leave_count: int = 0
    late_count: int = 0
    attendance_rate: float = 0.0
    absenteeism_rate: float = 0.0
    by_status: list[AttendanceStatusBreakdown]
    by_plant: list[GroupCount]
    by_shift: list[GroupCount]
    by_skill_match: list[GroupCount]
    by_training_compliance: list[GroupCount]
    trends: list[AttendanceTrendPoint] = []
    weekly_comparison: list[AttendanceTrendPoint] = []
    shift_breakdown: list[ShiftAttendanceBreakdown] = []
    by_vendor: list[dict[str, Any]] = []
    data_quality_warnings: list[DataQualityWarning]
