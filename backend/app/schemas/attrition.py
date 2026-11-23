"""Pydantic v2 schemas for workforce attrition analytics and employee exit transactions."""

from pydantic import BaseModel


class AttritionSummary(BaseModel):
    total_exits: int = 0
    total_exits_change_pct: float = 0.0
    overall_attrition_rate: float = 0.0
    attrition_rate_change_pp: float = 0.0
    permanent_exits: int = 0
    permanent_pct: float = 0.0
    vendor_exits: int = 0
    vendor_pct: float = 0.0
    average_tenure_years: float = 0.0
    tenure_change_years: float = 0.0
    active_employees: int = 0
    retained_employees: int = 0
    retention_rate: float = 100.0


class AttritionTrendPoint(BaseModel):
    month: str
    label: str
    total_exits: int = 0
    permanent_exits: int = 0
    vendor_exits: int = 0
    attrition_rate: float = 0.0


class AttritionByReason(BaseModel):
    reason: str
    count: int = 0
    pct: str = "0.0%"
    color: str = "#6F3DBA"


class DepartmentAttrition(BaseModel):
    department: str
    department_id: str
    count: int = 0
    pct: str = "0.0%"
    label: str = ""


class VendorAttrition(BaseModel):
    vendor: str
    vendor_id: str | None = None
    count: int = 0
    pct: str = "0.0%"
    label: str = ""


class TenureAttrition(BaseModel):
    band: str
    count: int = 0
    pct: str = "0.0%"
    label: str = ""


class ExitedEmployeeRecord(BaseModel):
    attrition_id: str
    employee_id: str
    employee_name: str
    plant_id: str
    department: str
    department_id: str
    section: str
    section_id: str
    designation: str
    employment_type: str
    vendor: str
    tenure_months: float
    resignation_date: str
    last_working_day: str
    exit_reason: str
    exit_type: str
    regrettable_loss: str


class AttritionAnalyticsResponse(BaseModel):
    summary: AttritionSummary
    monthly_trend: list[AttritionTrendPoint] = []
    weekly_trend: list[AttritionTrendPoint] = []
    daily_trend: list[AttritionTrendPoint] = []
    by_reason: list[AttritionByReason] = []
    by_department: list[DepartmentAttrition] = []
    by_vendor: list[VendorAttrition] = []
    by_tenure: list[TenureAttrition] = []
    exited_records: list[ExitedEmployeeRecord] = []

