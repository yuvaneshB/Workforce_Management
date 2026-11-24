"""Service layer for workforce retrieval and summary endpoints."""

import datetime as dt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.department import DepartmentMaster
from app.models.section import SectionMaster
from app.models.vendor import VendorMaster
from app.repositories import vendor_workforce_repository, workforce_repository
from app.schemas.common import DateWindow, GroupCount
from app.schemas.vendor_workforce import VendorWorkforceOverviewResponse
from app.schemas.workforce import (
    WorkforceListResponse,
    WorkforceRecord,
    WorkforceSummaryResponse,
)
from app.utils.query_helpers import build_pagination_meta


def list_employees(
    db: Session,
    *,
    search: str | None = None,
    plant_id: str | None = None,
    team_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    vendor_id: str | None = None,
    employment_type: str | None = None,
    role: str | None = None,
    skill_grade: str | None = None,
    certification: str | None = None,
    home_shift: str | None = None,
    active_status: str | None = None,
    sort_by: str = "employee_id",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> WorkforceListResponse:
    """Return paginated employee records."""
    items, total = workforce_repository.list_employees(
        db,
        search=search,
        plant_id=plant_id,
        team_id=team_id,
        department_id=department_id,
        section_id=section_id,
        vendor_id=vendor_id,
        employment_type=employment_type,
        role=role,
        skill_grade=skill_grade,
        certification=certification,
        home_shift=home_shift,
        active_status=active_status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    
    vendor_lookup = (
        {v.vendor_id: v.vendor_name for v in db.execute(select(VendorMaster)).scalars()}
        if any(i.vendor_id for i in items)
        else {}
    )
    dept_lookup = (
        {d.department_id: d.department_name for d in db.execute(select(DepartmentMaster)).scalars()}
        if any(i.department_id for i in items)
        else {}
    )
    sec_lookup = (
        {s.section_id: s.section_name for s in db.execute(select(SectionMaster)).scalars()}
        if any(i.section_id for i in items)
        else {}
    )

    records = []
    for item in items:
        rec = WorkforceRecord.model_validate(item)
        if item.vendor_id and item.vendor_id in vendor_lookup:
            rec.vendor_name = vendor_lookup[item.vendor_id]
        if item.department_id and item.department_id in dept_lookup:
            rec.department_name = dept_lookup[item.department_id]
        if item.section_id and item.section_id in sec_lookup:
            rec.section_name = sec_lookup[item.section_id]
        records.append(rec)

    return WorkforceListResponse(
        items=records,
        pagination=build_pagination_meta(
            total=total,
            limit=limit,
            offset=offset,
            returned=len(records),
        ),
    )


def get_vendor_workforce_overview(
    db: Session,
    *,
    plant_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    shift_id: str | None = None,
    vendor_id: str | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    period: str = "daily",
) -> VendorWorkforceOverviewResponse:
    """Return consolidated vendor workforce KPIs, directory, allocation, attendance, and attrition."""
    data = vendor_workforce_repository.get_vendor_workforce_overview(
        db,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
        shift_id=shift_id,
        vendor_id=vendor_id,
        start_date=start_date,
        end_date=end_date,
        period=period,
    )
    return VendorWorkforceOverviewResponse.model_validate(data)


def get_employee(db: Session, employee_id: str) -> WorkforceRecord | None:
    """Return a single employee record or None when not found."""
    clean_id = employee_id.strip()
    if not clean_id:
        raise ValueError("employee_id must not be blank.")
    row = workforce_repository.get_employee_by_id(db, clean_id)
    if row is None:
        return None
    return WorkforceRecord.model_validate(row)


def get_workforce_summary(
    db: Session,
    *,
    plant_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    shift_id: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
    team_id: str | None = None,
) -> WorkforceSummaryResponse:
    """Return aggregated workforce metrics derived from Neon records, optionally filtered by dimensions."""
    raw = workforce_repository.get_workforce_summary(
        db,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
        shift_id=shift_id,
        employment_type=employment_type,
        vendor_id=vendor_id,
        team_id=team_id,
    )
    return WorkforceSummaryResponse(
        total_employees=raw["total_employees"],
        active_employees=raw["active_employees"],
        distinct_teams=raw["distinct_teams"],
        distinct_departments=raw.get("distinct_departments", 0),
        permanent_count=raw.get("permanent_count", 0),
        vendor_count=raw.get("vendor_count", 0),
        resigned_employees=raw.get("resigned_employees", 0),
        inactive_employees=raw.get("inactive_employees", 0),
        by_role=[GroupCount(key=k, count=c) for k, c in raw["by_role"]],
        by_skill_grade=[GroupCount(key=k, count=c) for k, c in raw["by_skill_grade"]],
        by_certification=[GroupCount(key=k, count=c) for k, c in raw["by_certification"]],
        by_home_shift=[GroupCount(key=k, count=c) for k, c in raw["by_home_shift"]],
        by_active_status=[GroupCount(key=k, count=c) for k, c in raw["by_active_status"]],
        by_employment_type=[GroupCount(key=k, count=c) for k, c in raw.get("by_employment_type", [])],
        by_vendor=[GroupCount(key=k, count=c) for k, c in raw.get("by_vendor", [])],
        by_plant=[GroupCount(key=k, count=c) for k, c in raw.get("by_plant", [])],
        attendance_coverage_window=(
            DateWindow(**raw["attendance_coverage_window"])
            if raw["attendance_coverage_window"]
            else None
        ),
        production_coverage_window=(
            DateWindow(**raw["production_coverage_window"])
            if raw["production_coverage_window"]
            else None
        ),
    )

