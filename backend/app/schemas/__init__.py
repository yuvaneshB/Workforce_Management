"""Pydantic schemas package."""

from app.schemas.attendance import (
    AttendanceAnalyticsResponse,
    AttendanceListResponse,
    AttendanceRecord,
    AttendanceStatusBreakdown,
)
from app.schemas.common import DataQualityWarning, DateWindow, GroupCount, PaginationMeta
from app.schemas.health import ConnectionStatus, DatabaseHealthResponse, HealthResponse
from app.schemas.production import (
    DowntimeReasonBreakdown,
    ProductionAnalyticsResponse,
    ProductionListResponse,
    ProductionPlantLineBreakdown,
    ProductionProductBreakdown,
    ProductionRecord,
    ProductionShiftBreakdown,
)
from app.schemas.shift_calendar import ShiftCalendarListResponse, ShiftCalendarRecord
from app.schemas.workforce import (
    WorkforceListResponse,
    WorkforceRecord,
    WorkforceSummaryResponse,
)

__all__ = [
    "AttendanceAnalyticsResponse",
    "AttendanceListResponse",
    "AttendanceRecord",
    "AttendanceStatusBreakdown",
    "ConnectionStatus",
    "DataQualityWarning",
    "DatabaseHealthResponse",
    "DateWindow",
    "DowntimeReasonBreakdown",
    "GroupCount",
    "HealthResponse",
    "PaginationMeta",
    "ProductionAnalyticsResponse",
    "ProductionListResponse",
    "ProductionPlantLineBreakdown",
    "ProductionProductBreakdown",
    "ProductionRecord",
    "ProductionShiftBreakdown",
    "ShiftCalendarListResponse",
    "ShiftCalendarRecord",
    "WorkforceListResponse",
    "WorkforceRecord",
    "WorkforceSummaryResponse",
]
