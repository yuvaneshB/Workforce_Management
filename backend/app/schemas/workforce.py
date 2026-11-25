"""Pydantic v2 schemas for dim_workforce and workforce summary endpoints."""

import datetime as dt
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

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


# ---------------------------------------------------------------------------
# Employee Create & Options Schemas
# ---------------------------------------------------------------------------

class PlantOption(BaseModel):
    plant_id: str
    plant_name: str
    city: str | None = None
    state: str | None = None


class DepartmentOption(BaseModel):
    department_id: str
    department_name: str
    plant_id: str


class SectionOption(BaseModel):
    section_id: str
    section_name: str
    department_id: str


class ShiftOption(BaseModel):
    shift_id: str
    shift_name: str
    start_time: str | None = None
    end_time: str | None = None


class VendorOption(BaseModel):
    vendor_id: str
    vendor_name: str


class DesignationOption(BaseModel):
    designation: str
    department_id: str
    section_id: str


class ExperienceBandOption(BaseModel):
    experience_band: str
    min_exp: float
    max_exp: float


class EmployeeCreateOptionsResponse(BaseModel):
    plants: list[PlantOption]
    departments: list[DepartmentOption]
    sections: list[SectionOption]
    shifts: list[ShiftOption]
    vendors: list[VendorOption]
    distinct_designations: list[DesignationOption]
    distinct_experience_bands: list[ExperienceBandOption]
    employment_types: list[str] = ["Permanent", "Vendor"]
    grades: list[str] = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"]
    genders: list[str] = ["Male", "Female"]
    marital_statuses: list[str] = ["Single", "Married"]
    cities: list[str] = []


class EmployeeCreateRequest(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: str  # YYYY-MM-DD
    marital_status: str
    residence_city: str
    employment_type: str
    plant_id: str
    department_id: str
    section_id: str
    designation: str
    grade: str
    shift_id: str
    date_of_joining: str  # YYYY-MM-DD
    vendor_id: str | None = None
    previous_experience_years: float = 0.0

    @field_validator(
        "first_name",
        "last_name",
        "marital_status",
        "residence_city",
        "plant_id",
        "department_id",
        "section_id",
        "designation",
        "grade",
        "shift_id",
        "employment_type",
    )
    @classmethod
    def check_non_empty(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name.replace('_', ' ').capitalize()} is required")
        return v.strip()

    @field_validator("gender")
    @classmethod
    def check_gender(cls, v: str) -> str:
        val = (v or "").strip().title()
        if val not in ("Male", "Female"):
            raise ValueError("Gender must be either 'Male' or 'Female'")
        return val

    @field_validator("previous_experience_years")
    @classmethod
    def check_prev_exp(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Previous experience years must be >= 0")
        return round(float(v), 1)

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, v: str) -> str:
        try:
            d = dt.date.fromisoformat(v.strip())
        except Exception:
            raise ValueError("Invalid date_of_birth format. Expected YYYY-MM-DD")
        today = dt.date.today()
        age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
        if age < 18 or age > 65:
            raise ValueError(f"Employee age must be between 18 and 65 years (calculated age: {age})")
        return v.strip()

    @field_validator("date_of_joining")
    @classmethod
    def check_doj(cls, v: str) -> str:
        try:
            d = dt.date.fromisoformat(v.strip())
        except Exception:
            raise ValueError("Invalid date_of_joining format. Expected YYYY-MM-DD")
        today = dt.date.today()
        if d > today:
            raise ValueError("Date of joining cannot be in the future")
        return v.strip()

    @model_validator(mode="after")
    def check_vendor_consistency(self) -> "EmployeeCreateRequest":
        is_vendor = self.employment_type.lower() == "vendor" or "contract" in self.employment_type.lower()
        if is_vendor:
            if not self.vendor_id or not self.vendor_id.strip():
                raise ValueError("Vendor is required when employment_type is Vendor/Contract")
        else:
            if self.vendor_id and self.vendor_id.strip():
                raise ValueError("Vendor must be empty for permanent employees")
        return self


class EmployeeCreateResponse(BaseModel):
    employee_id: str
    full_name: str
    employee_class: str
    department_name: str
    section_name: str
    shift: str
    plant: str
    experience_band: str


class EmployeeSearchResult(BaseModel):
    id: str
    name: str
    employee_id: str
    full_name: str
    plant_id: str
    department_id: str
    department_name: str
    section_id: str
    section_name: str
    designation: str
    employment_type: str
    vendor_id: str | None = None
    vendor_name: str | None = None
    shift_id: str
    date_of_joining: dt.date
    current_tenure_months: float
    employment_status: str


class EmployeeExitOptionsResponse(BaseModel):
    exit_types: list[str]
    exit_reasons: list[str]
    regrettable_loss_options: list[str] = ["No", "Yes"]


class EmployeeRelieveRequest(BaseModel):
    exit_date: dt.date
    exit_type: str
    exit_reason: str
    regrettable_loss: str = "No"
    remarks: str | None = Field(default=None, max_length=500)

    @field_validator("exit_date")
    @classmethod
    def validate_not_future(cls, v: dt.date) -> dt.date:
        if v > dt.date.today():
            raise ValueError("Exit date cannot be in the future.")
        return v

    @field_validator("regrettable_loss")
    @classmethod
    def validate_regrettable(cls, v: str) -> str:
        clean = v.strip().capitalize()
        if clean not in ("Yes", "No"):
            raise ValueError("Regrettable loss must be 'Yes' or 'No'.")
        return clean


class EmployeeRelieveResponse(BaseModel):
    success: bool = True
    employee_id: str
    full_name: str
    employment_status: str
    exit_date: dt.date
    exit_type: str
    exit_reason: str
    regrettable_loss: str
    tenure_months: float
    attrition_id: str
    message: str


class RelievedEmployeeItem(BaseModel):
    attrition_id: str
    employee_id: str
    employee_name: str
    department_name: str
    exit_date: dt.date
    exit_type: str
    exit_reason: str
    regrettable_loss: str
    tenure_months: float


class EmployeeReinstateResponse(BaseModel):
    success: bool = True
    employee_id: str
    message: str



