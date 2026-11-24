"""Pydantic v2 schemas for dim_workforce and workforce summary endpoints."""

from pydantic import BaseModel, ConfigDict

from app.schemas.common import DateWindow, GroupCount, PaginationMeta


class WorkforceRecord(BaseModel):
    """Serialized row from public.dim_workforce (enriched with employee_master if present)."""

    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    employee_name: str | None = None
    team_id: str
    role: str
    skill_grade: str
    certification: str
    home_shift: str
    active_status: str
    plant_id: str | None = None
    department_id: str | None = None
    section_id: str | None = None
    employment_type: str | None = None
    vendor_id: str | None = None
    vendor_name: str | None = None
    department_name: str | None = None
    section_name: str | None = None


class WorkforceListResponse(BaseModel):
    """Paginated response for GET /api/v1/employees."""

    items: list[WorkforceRecord]
    pagination: PaginationMeta


class WorkforceSummaryResponse(BaseModel):
    """Aggregated workforce summary derived from Neon database records."""

    total_employees: int
    active_employees: int
    distinct_teams: int
    distinct_departments: int = 0
    permanent_count: int = 0
    vendor_count: int = 0
    resigned_employees: int = 0
    inactive_employees: int = 0
    by_role: list[GroupCount]
    by_skill_grade: list[GroupCount]
    by_certification: list[GroupCount]
    by_home_shift: list[GroupCount]
    by_active_status: list[GroupCount]
    by_employment_type: list[GroupCount] = []
    by_vendor: list[GroupCount] = []
    by_plant: list[GroupCount] = []
    attendance_coverage_window: DateWindow | None = None
    production_coverage_window: DateWindow | None = None

