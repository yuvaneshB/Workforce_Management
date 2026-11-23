"""Pydantic v2 schemas for fact_hourly_production and production analytics."""

import datetime as dt

from pydantic import BaseModel, ConfigDict

from app.schemas.common import PaginationMeta


class ProductionRecord(BaseModel):
    """Serialized row from public.production_transactions."""

    model_config = ConfigDict(from_attributes=True)

    event_id: str
    event_ts: dt.datetime
    event_date: dt.date
    year: int = 2026
    month: int = 1
    week: int = 1
    day: int = 1
    hour: int = 6
    plant_id: str
    line_id: str
    shift_id: str
    product_id: str
    production_order_id: str = ""
    target_qty: int
    actual_qty: int
    good_qty: int
    reject_qty: int
    rework_qty: int
    downtime_min: int
    downtime_reason: str = ""
    operator_team: str = ""
    source_system: str = "MES"
    data_quality: str = "GOOD"


class ProductionListResponse(BaseModel):
    """Paginated response for GET /api/v1/production."""

    items: list[ProductionRecord]
    pagination: PaginationMeta


class ProductionPlantLineBreakdown(BaseModel):
    """Aggregated stored production quantities grouped by plant_id and line_id."""

    plant_id: str
    line_id: str
    event_count: int
    target_qty: int
    actual_qty: int
    good_qty: int
    reject_qty: int
    rework_qty: int
    downtime_min: int


class ProductionShiftBreakdown(BaseModel):
    """Aggregated stored production quantities grouped by shift_id."""

    shift_id: str
    event_count: int
    target_qty: int
    actual_qty: int
    good_qty: int
    reject_qty: int
    rework_qty: int
    downtime_min: int


class DowntimeReasonBreakdown(BaseModel):
    """Aggregated downtime minutes and event counts grouped by downtime_reason."""

    downtime_reason: str
    event_count: int
    downtime_min: int


class ProductionProductBreakdown(BaseModel):
    """Aggregated stored production quantities grouped by product_id."""

    product_id: str
    event_count: int
    target_qty: int
    actual_qty: int
    good_qty: int
    reject_qty: int
    rework_qty: int


class ProductionAnalyticsResponse(BaseModel):
    """Aggregated production analytics derived directly from Neon database records."""

    total_events: int
    distinct_orders: int
    total_target_qty: int
    total_actual_qty: int
    total_good_qty: int
    total_reject_qty: int
    total_rework_qty: int
    total_downtime_min: int
    by_plant_line: list[ProductionPlantLineBreakdown]
    by_shift: list[ProductionShiftBreakdown]
    by_downtime_reason: list[DowntimeReasonBreakdown]
    by_product: list[ProductionProductBreakdown]

