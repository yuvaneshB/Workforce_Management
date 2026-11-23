"""Read-only repository for department and section master/mapping tables."""

from sqlalchemy import asc, func, inspect, or_, select
from sqlalchemy.orm import Session

from app.models.department import DepartmentMaster, EmployeeDepartmentMapping
from app.models.section import EmployeeSectionMapping, SectionMaster


def _tables_exist(db: Session, *table_names: str) -> bool:
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(name, schema="public") for name in table_names)


def list_departments(
    db: Session,
    *,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[bool, list[dict], int]:
    if not _tables_exist(db, "department_master", "employee_department_mapping"):
        return False, [], 0

    base_q = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.count(EmployeeDepartmentMapping.employee_id).label("employee_count"),
        )
        .outerjoin(
            EmployeeDepartmentMapping,
            DepartmentMaster.department_id == EmployeeDepartmentMapping.department_id,
        )
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
    )
    count_q = select(func.count()).select_from(DepartmentMaster)

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        cond = or_(
            DepartmentMaster.department_id.ilike(pattern),
            DepartmentMaster.department_name.ilike(pattern),
        )
        base_q = base_q.where(cond)
        count_q = count_q.where(cond)

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
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[bool, list[dict], int]:
    if not _tables_exist(db, "section_master", "employee_section_mapping"):
        return False, [], 0

    base_q = (
        select(
            SectionMaster.section_id,
            SectionMaster.section_name,
            func.count(EmployeeSectionMapping.employee_id).label("employee_count"),
        )
        .outerjoin(
            EmployeeSectionMapping,
            SectionMaster.section_id == EmployeeSectionMapping.section_id,
        )
        .group_by(SectionMaster.section_id, SectionMaster.section_name)
    )
    count_q = select(func.count()).select_from(SectionMaster)

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        cond = or_(
            SectionMaster.section_id.ilike(pattern),
            SectionMaster.section_name.ilike(pattern),
        )
        base_q = base_q.where(cond)
        count_q = count_q.where(cond)

    total = int(db.execute(count_q).scalar_one())
    rows = db.execute(
        base_q.order_by(asc(SectionMaster.section_id)).limit(limit).offset(offset)
    ).all()
    items = [
        {
            "section_id": str(r[0]),
            "section_name": str(r[1]),
            "employee_count": int(r[2]),
        }
        for r in rows
    ]
    return True, items, total

