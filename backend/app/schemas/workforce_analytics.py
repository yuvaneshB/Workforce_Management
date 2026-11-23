"""Pydantic v2 schemas for gender, department, experience, new joiner, and section analytics."""

import datetime as dt

from pydantic import BaseModel


class GenderBucket(BaseModel):
    gender: str
    employee_count: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float
    absenteeism_pct: float


class GenderAnalyticsResponse(BaseModel):
    total_employees: int
    buckets: list[GenderBucket]


class DepartmentAnalyticsItem(BaseModel):
    department_id: str
    department_name: str
    employee_count: int
    male_count: int
    female_count: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float
    absenteeism_pct: float


class DepartmentAnalyticsResponse(BaseModel):
    total_departments: int
    items: list[DepartmentAnalyticsItem]


class ExperienceAnalyticsItem(BaseModel):
    category: str
    employee_count: int
    male_count: int
    female_count: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float
    absenteeism_pct: float


class ExperienceAnalyticsResponse(BaseModel):
    items: list[ExperienceAnalyticsItem]


class NewJoinerTrendPoint(BaseModel):
    period_key: str
    label: str
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float
    absenteeism_pct: float


class NewJoinerAnalyticsResponse(BaseModel):
    anchor_date: dt.date | None
    lookback_start: dt.date | None
    total_new_joiners: int
    avg_tenure_months: float | None
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float | None
    absenteeism_pct: float | None
    trends: list[NewJoinerTrendPoint]


class SectionAnalyticsItem(BaseModel):
    section_id: str
    section_name: str
    employee_count: int
    male_count: int
    female_count: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_pct: float
    absenteeism_pct: float


class SectionAnalyticsResponse(BaseModel):
    total_sections: int
    items: list[SectionAnalyticsItem]


class VendorAnalyticsItem(BaseModel):
    vendor_id: str
    vendor_name: str
    assigned_count: int
    active_count: int
    resigned_count: int
    percentage: float


class VendorAnalyticsResponse(BaseModel):
    total_vendors: int
    total_vendor_workforce: int
    total_active_vendor_workforce: int
    total_permanent_workforce: int
    total_workforce: int
    items: list[VendorAnalyticsItem]


