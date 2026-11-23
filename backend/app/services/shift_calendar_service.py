"""Service layer for shift calendar retrieval."""

import datetime as dt

from sqlalchemy.orm import Session

from app.repositories import shift_calendar_repository
from app.schemas.shift_calendar import ShiftCalendarListResponse, ShiftCalendarRecord
from app.utils.query_helpers import build_pagination_meta, validate_date_range


def list_shifts(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    is_working_day: bool | None = None,
    sort_by: str = "calendar_date",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> ShiftCalendarListResponse:
    """Return paginated shift calendar records."""
    validate_date_range(start_date, end_date)
    items, total = shift_calendar_repository.list_shifts(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        is_working_day=is_working_day,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    records = [ShiftCalendarRecord.model_validate(item) for item in items]
    return ShiftCalendarListResponse(
        items=records,
        pagination=build_pagination_meta(
            total=total,
            limit=limit,
            offset=offset,
            returned=len(records),
        ),
    )

