"""Pydantic v2 schemas for Vendor Workforce endpoints."""

import datetime as dt
from pydantic import BaseModel, ConfigDict


class VendorKPISummary(BaseModel):
    """Four core KPI metrics dynamically computed from Neon PostgreSQL."""

    total_vendor_employees: int
    active_vendors: int
    assigned_employees: int
    unassigned_employees: int


class VendorDirectoryItem(BaseModel):
    """Vendor row for Vendor Directory table."""

    vendor_id: str
    vendor_name: str
    total_employees: int
    assigned_employees: int
    unassigned_employees: int
    plant: str
    department: str
    status: str
    service_category: str | None = None
    contact_person: str | None = None
    city: str | None = None
    state: str | None = None
    performance_rating: float | None = None
    payment_terms_days: int | None = None
    contract_start: dt.date | None = None
    contract_end: dt.date | None = None


class AllocationBreakdownItem(BaseModel):
    """Allocation breakdown for Plant, Department, Section, and Shift."""

    id: str
    label: str
    total: int
    assigned: int
    unassigned: int
    percentage: float = 0.0


class VendorWorkforceAllocation(BaseModel):
    """Workforce distribution across organization dimensions."""

    by_plant: list[AllocationBreakdownItem]
    by_department: list[AllocationBreakdownItem]
    by_section: list[AllocationBreakdownItem]
    by_shift: list[AllocationBreakdownItem]


class AttendanceTrendPoint(BaseModel):
    """Trend point for vendor attendance (daily, weekly, or monthly)."""

    date: str
    total: int
    present: int
    absent: int
    leave: int
    late: int
    attendance_pct: float


class VendorAttendanceSummary(BaseModel):
    """Vendor attendance aggregates and trend points."""

    present_count: int
    absent_count: int
    leave_count: int
    late_count: int
    attendance_pct: float
    trend: list[AttendanceTrendPoint]


class AttritionReasonCount(BaseModel):
    """Exit reason frequency and share."""

    reason: str
    count: int
    percentage: float


class AttritionTrendPoint(BaseModel):
    """Monthly exits count."""

    month: str
    exits: int


class GroupExitCount(BaseModel):
    """Exits grouped by dimension (vendor, plant, department)."""

    key: str
    label: str
    exits: int
    percentage: float


class VendorAttritionSummary(BaseModel):
    """Vendor attrition aggregates and historical patterns."""

    total_exits: int
    monthly_trends: list[AttritionTrendPoint]
    by_vendor: list[GroupExitCount]
    by_plant: list[GroupExitCount]
    by_department: list[GroupExitCount]
    exit_reasons: list[AttritionReasonCount]


class VendorWorkforceOverviewResponse(BaseModel):
    """Consolidated response for Vendor Workforce dashboard and analytics."""

    kpis: VendorKPISummary
    vendors: list[VendorDirectoryItem]
    allocation: VendorWorkforceAllocation
    attendance: VendorAttendanceSummary
    attrition: VendorAttritionSummary

