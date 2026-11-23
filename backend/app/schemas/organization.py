"""Pydantic v2 schemas for departments and sections endpoints."""

from pydantic import BaseModel

from app.schemas.common import PaginationMeta


class DepartmentItem(BaseModel):
    department_id: str
    department_name: str
    employee_count: int


class DepartmentListResponse(BaseModel):
    dataset_available: bool
    items: list[DepartmentItem]
    pagination: PaginationMeta


class SectionItem(BaseModel):
    section_id: str
    section_name: str
    department_id: str | None = None
    employee_count: int


class SectionListResponse(BaseModel):
    dataset_available: bool
    items: list[SectionItem]
    pagination: PaginationMeta

