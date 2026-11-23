"""Pydantic v2 schemas for dim_shift_calendar."""

import datetime as dt

from pydantic import BaseModel, ConfigDict

from app.schemas.common import PaginationMeta


class ShiftCalendarRecord(BaseModel):
    """Serialized row from public.dim_shift_calendar."""

    model_config = ConfigDict(from_attributes=True)

    calendar_date: dt.date
    shift_id: str
    shift_start: dt.datetime
    shift_end: dt.datetime
    planned_minutes: int
    break_minutes: int
    is_working_day: bool


class ShiftCalendarListResponse(BaseModel):
    """Paginated response for GET /api/v1/shifts."""

    items: list[ShiftCalendarRecord]
    pagination: PaginationMeta

