"""Read-only repository for public.employee_master."""

import datetime as dt

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.employee_master import EmployeeMaster
from app.models.production import HourlyProduction

ALLOWED_WORKFORCE_SORT_COLUMNS = {
    "employee_id": EmployeeMaster.employee_id,
    "team_id": EmployeeMaster.section_id,
    "role": EmployeeMaster.designation,
    "skill_grade": EmployeeMaster.grade,
    "certification": EmployeeMaster.employee_id,
    "home_shift": EmployeeMaster.shift_id,
    "active_status": EmployeeMaster.employment_status,
}


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
) -> tuple[list[EmployeeMaster], int]:
    """Fetch paginated employees from employee_master."""
    stmt = select(EmployeeMaster)
    count_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster)

    filters = []
    if plant_id:
        filters.append(EmployeeMaster.plant_id == plant_id)
    if department_id:
        filters.append(EmployeeMaster.department_id == department_id)
    if section_id:
        filters.append(EmployeeMaster.section_id == section_id)
    if vendor_id:
        filters.append(EmployeeMaster.vendor_id == vendor_id)
    if employment_type:
        filters.append(EmployeeMaster.employment_type.ilike(employment_type))
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                EmployeeMaster.employee_id.ilike(pattern),
                EmployeeMaster.full_name.ilike(pattern),
                EmployeeMaster.section_id.ilike(pattern),
                EmployeeMaster.designation.ilike(pattern),
                EmployeeMaster.grade.ilike(pattern),
                EmployeeMaster.vendor_id.ilike(pattern),
            )
        )
    if team_id:
        filters.append(EmployeeMaster.section_id == team_id)
    if role:
        filters.append(EmployeeMaster.designation == role)
    if skill_grade:
        filters.append(EmployeeMaster.grade == skill_grade)
    if home_shift:
        filters.append(EmployeeMaster.shift_id == home_shift)
    if active_status:
        filters.append(EmployeeMaster.employment_status.ilike(active_status))

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    sort_col = ALLOWED_WORKFORCE_SORT_COLUMNS.get(sort_by, EmployeeMaster.employee_id)
    order_fn = desc if sort_order == "desc" else asc
    stmt = stmt.order_by(order_fn(sort_col), asc(EmployeeMaster.employee_id)).limit(limit).offset(offset)

    total = int(db.execute(count_stmt).scalar_one())
    items = list(db.execute(stmt).scalars().all())
    return items, total


def get_employee_by_id(db: Session, employee_id: str) -> EmployeeMaster | None:
    """Fetch a single employee record by employee_id primary key."""
    stmt = select(EmployeeMaster).where(EmployeeMaster.employee_id == employee_id)
    return db.execute(stmt).scalar_one_or_none()


def get_workforce_summary(
    db: Session,
    *,
    plant_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    shift_id: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
) -> dict:
    """Compute aggregated workforce distributions and data coverage windows, optionally filtered by dimensions."""
    emp_filters = []
    if plant_id and plant_id.strip():
        emp_filters.append(EmployeeMaster.plant_id == plant_id.strip())
    if department_id and department_id.strip():
        emp_filters.append(EmployeeMaster.department_id == department_id.strip())
    if section_id and section_id.strip():
        emp_filters.append(EmployeeMaster.section_id == section_id.strip())
    if shift_id and shift_id.strip():
        emp_filters.append(EmployeeMaster.shift_id == shift_id.strip())
    if employment_type and employment_type.strip():
        emp_filters.append(EmployeeMaster.employment_type.ilike(employment_type.strip()))
    if vendor_id and vendor_id.strip():
        emp_filters.append(EmployeeMaster.vendor_id == vendor_id.strip())

    total_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster)
    active_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(
        EmployeeMaster.employment_status.ilike("active")
    )
    distinct_teams_stmt = select(func.count(func.distinct(EmployeeMaster.section_id))).select_from(EmployeeMaster)
    perm_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(
        EmployeeMaster.employment_type.ilike("permanent")
    )
    vend_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(
        EmployeeMaster.employment_type.ilike("vendor")
    )
    resigned_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(
        EmployeeMaster.employment_status.ilike("resigned")
    )

    if emp_filters:
        total_stmt = total_stmt.where(*emp_filters)
        active_stmt = active_stmt.where(*emp_filters)
        distinct_teams_stmt = distinct_teams_stmt.where(*emp_filters)
        perm_stmt = perm_stmt.where(*emp_filters)
        vend_stmt = vend_stmt.where(*emp_filters)
        resigned_stmt = resigned_stmt.where(*emp_filters)

    total_employees = int(db.execute(total_stmt).scalar_one())
    active_employees = int(db.execute(active_stmt).scalar_one())
    distinct_teams = int(db.execute(distinct_teams_stmt).scalar_one())
    permanent_count = int(db.execute(perm_stmt).scalar_one())
    vendor_count = int(db.execute(vend_stmt).scalar_one())
    resigned_count = int(db.execute(resigned_stmt).scalar_one())

    def _grouped_counts_scoped(column) -> list[tuple[str, int]]:
        stmt = select(column, func.count(EmployeeMaster.employee_id)).group_by(column).order_by(asc(column))
        if emp_filters:
            stmt = stmt.where(*emp_filters)
        return [(str(row[0]) if row[0] is not None else "Permanent", int(row[1])) for row in db.execute(stmt).all()]

    att_stmt = select(func.min(WorkforceAttendance.work_date), func.max(WorkforceAttendance.work_date))
    prod_stmt = select(func.min(HourlyProduction.work_date), func.max(HourlyProduction.work_date))
    if plant_id:
        att_stmt = att_stmt.where(WorkforceAttendance.plant_id == plant_id)
        prod_stmt = prod_stmt.where(HourlyProduction.plant_id == plant_id)

    att_min, att_max = db.execute(att_stmt).one()
    prod_min, prod_max = db.execute(prod_stmt).one()

    def _window(min_d: dt.date | None, max_d: dt.date | None) -> dict[str, dt.date] | None:
        if min_d is None or max_d is None:
            return None
        return {"min_date": min_d, "max_date": max_d}

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "distinct_teams": distinct_teams,
        "permanent_count": permanent_count,
        "vendor_count": vendor_count,
        "resigned_employees": resigned_count,
        "inactive_employees": 0,
        "by_role": _grouped_counts_scoped(EmployeeMaster.designation),
        "by_skill_grade": _grouped_counts_scoped(EmployeeMaster.grade),
        "by_certification": [],
        "by_home_shift": _grouped_counts_scoped(EmployeeMaster.shift_id),
        "by_active_status": _grouped_counts_scoped(EmployeeMaster.employment_status),
        "by_employment_type": _grouped_counts_scoped(EmployeeMaster.employment_type),
        "by_vendor": _grouped_counts_scoped(EmployeeMaster.vendor_id),
        "by_plant": _grouped_counts_scoped(EmployeeMaster.plant_id),
        "attendance_coverage_window": _window(att_min, att_max),
        "production_coverage_window": _window(prod_min, prod_max),
    }
