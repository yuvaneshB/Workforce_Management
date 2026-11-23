"""Shared validation and pagination helpers for read-only services."""

import datetime as dt

from app.schemas.common import DataQualityWarning, PaginationMeta


def validate_date_range(start_date: dt.date | None, end_date: dt.date | None) -> None:
    """Validate that start_date is not after end_date."""
    if start_date is not None and end_date is not None and start_date > end_date:
        raise ValueError("start_date must be less than or equal to end_date.")


def build_pagination_meta(*, total: int, limit: int, offset: int, returned: int) -> PaginationMeta:
    """Build consistent pagination metadata."""
    return PaginationMeta(total=total, limit=limit, offset=offset, returned=returned)


def build_attendance_quality_warnings(counts: dict[str, int]) -> list[DataQualityWarning]:
    """Convert non-zero SQL attendance data-quality counts into structured warnings."""
    definitions = [
        (
            "ABSENT_WITH_ACTUAL_HOURS",
            "absent_with_actual_hours",
            "Source dataset contains ABSENT attendance records with actual_hours > 0; original values preserved.",
        ),
        (
            "LEAVE_WITH_ACTUAL_HOURS",
            "leave_with_actual_hours",
            "Source dataset contains LEAVE attendance records with actual_hours > 0; original values preserved.",
        ),
        (
            "PRESENT_WITH_ZERO_ACTUAL_HOURS",
            "present_with_zero_actual_hours",
            "Source dataset contains PRESENT attendance records with actual_hours = 0; original values preserved.",
        ),
        (
            "LATE_WITH_ZERO_ACTUAL_HOURS",
            "late_with_zero_actual_hours",
            "Source dataset contains LATE attendance records with actual_hours = 0; original values preserved.",
        ),
    ]
    warnings: list[DataQualityWarning] = []
    for code, key, message in definitions:
        affected = int(counts.get(key, 0))
        if affected > 0:
            warnings.append(
                DataQualityWarning(
                    code=code,
                    message=message,
                    affected_records=affected,
                )
            )
    return warnings

