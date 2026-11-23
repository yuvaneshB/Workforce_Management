"""Shared Pydantic v2 response schemas."""

import datetime as dt

from pydantic import BaseModel, Field


class PaginationMeta(BaseModel):
    """Pagination metadata returned alongside list endpoints."""

    total: int = Field(..., ge=0)
    limit: int = Field(..., ge=1)
    offset: int = Field(..., ge=0)
    returned: int = Field(..., ge=0)


class GroupCount(BaseModel):
    """Generic grouped count item returned by summary/analytics queries."""

    key: str
    count: int = Field(..., ge=0)


class DateWindow(BaseModel):
    """Observed min/max date coverage window from actual database records."""

    min_date: dt.date
    max_date: dt.date


class DataQualityWarning(BaseModel):
    """Non-blocking data-quality observation reported separately from business metrics."""

    code: str
    message: str
    affected_records: int = Field(..., ge=0)

