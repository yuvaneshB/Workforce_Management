"""Read-only repository for department and section master/mapping tables."""

from sqlalchemy import asc, func, inspect, or_, select, and_
from sqlalchemy.orm import Session

from app.models.department import DepartmentMaster, EmployeeDepartmentMapping
from app.models.employee_master import EmployeeMaster
from app.models.section import EmployeeSectionMapping, SectionMaster


def _tables_exist(db: Session, *table_names: str) -> bool:
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(name, schema="public") for name in table_names)


def list_departments(
    db: Session,
    *,
    plant_id: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[bool, list[dict], int]:
    if not _tables_exist(db, "department_master", "employee_master"):
        return False, [], 0

    conditions = [
        EmployeeMaster.employment_status == "Active",
        or_(EmployeeMaster.exit_date.is_(None), EmployeeMaster.exit_date > func.current_date()),
    ]
    if plant_id and plant_id.strip():
        conditions.append(EmployeeMaster.plant_id == plant_id.strip())

    base_q = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.count(func.distinct(EmployeeMaster.employee_id)).label("employee_count"),
        )
        .join(
            EmployeeMaster,
            and_(
                DepartmentMaster.department_id == EmployeeMaster.department_id,
                *conditions,
            ),
        )
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
        .having(func.count(func.distinct(EmployeeMaster.employee_id)) > 0)
    )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        cond = or_(
            DepartmentMaster.department_id.ilike(pattern),
            DepartmentMaster.department_name.ilike(pattern),
        )
        base_q = base_q.where(cond)

    subq = base_q.subquery()
    count_q = select(func.count()).select_from(subq)
    total = int(db.execute(count_q).scalar_one())

    rows = db.execute(
        base_q.order_by(asc(DepartmentMaster.department_id)).limit(limit).offset(offset)
    ).all()
    items = [
        {
            "department_id": str(r[0]),
            "department_name": str(r[1]),
            "employee_count": int(r[2]),
        }
        for r in rows
    ]
    return True, items, total


def list_sections(
    db: Session,
    *,
    department_id: str | None = None,
    plant_id: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[bool, list[dict], int]:
    if not _tables_exist(db, "section_master", "employee_master"):
        return False, [], 0

    conditions = [
        EmployeeMaster.employment_status == "Active",
        or_(EmployeeMaster.exit_date.is_(None), EmployeeMaster.exit_date > func.current_date()),
    ]
    if plant_id and plant_id.strip():
        conditions.append(EmployeeMaster.plant_id == plant_id.strip())
    if department_id and department_id.strip():
        conditions.append(EmployeeMaster.department_id == department_id.strip())

    base_q = (
        select(
            SectionMaster.section_id,
            SectionMaster.section_name,
            SectionMaster.department_id,
            func.count(func.distinct(EmployeeMaster.employee_id)).label("employee_count"),
        )
        .join(
            EmployeeMaster,
            and_(
                SectionMaster.section_id == EmployeeMaster.section_id,
                *conditions,
            ),
        )
    )
    if department_id and department_id.strip():
        base_q = base_q.where(SectionMaster.department_id == department_id.strip())

    base_q = (
        base_q.group_by(
            SectionMaster.section_id,
            SectionMaster.section_name,
            SectionMaster.department_id,
        )
        .having(func.count(func.distinct(EmployeeMaster.employee_id)) > 0)
    )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        cond = or_(
            SectionMaster.section_id.ilike(pattern),
            SectionMaster.section_name.ilike(pattern),
        )
        base_q = base_q.where(cond)

    subq = base_q.subquery()
    count_q = select(func.count()).select_from(subq)
    total = int(db.execute(count_q).scalar_one())

    rows = db.execute(
        base_q.order_by(asc(SectionMaster.section_id)).limit(limit).offset(offset)
    ).all()
    items = [
        {
            "section_id": str(r[0]),
            "section_name": str(r[1]),
            "department_id": str(r[2]) if r[2] is not None else None,
            "employee_count": int(r[3]),
        }
        for r in rows
    ]
    return True, items, total

