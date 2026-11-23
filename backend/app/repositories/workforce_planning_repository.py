"""Workforce Planning Repository for availability, shortage detection, and replacement matching.

Provides read-only database queries over enterprise Neon PostgreSQL tables:
- employee_master
- employee_experience
- department_master
- section_master
- attendance_transactions
- shift_master
"""

import datetime as dt
from typing import Any

from sqlalchemy import and_, desc, func, literal, or_, select
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.section import SectionMaster
from app.models.shift_master import ShiftMaster


def get_attendance_records_for_planning(
    db: Session,
    *,
    target_date: dt.date,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    employee_id: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve date-specific attendance records joined with employee,
    department, and section dimensions for availability and shortage calculations.
    """
    stmt = (
        select(
            WorkforceAttendance.attendance_id,
            WorkforceAttendance.work_date,
            WorkforceAttendance.employee_id,
            EmployeeMaster.full_name.label("employee_name"),
            WorkforceAttendance.plant_id,
            WorkforceAttendance.shift_id,
            EmployeeMaster.shift_id.label("home_shift"),
            EmployeeMaster.section_id.label("team_id"),
            EmployeeMaster.designation.label("role"),
            EmployeeMaster.grade.label("skill_grade"),
            literal("").label("certification"),
            EmployeeMaster.employment_status.label("active_status"),
            WorkforceAttendance.scheduled_hours,
            WorkforceAttendance.actual_hours,
            WorkforceAttendance.attendance_status,
            WorkforceAttendance.overtime_hours,
            literal("MATCH").label("skill_match"),
            literal("COMPLIANT").label("training_compliance"),
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            SectionMaster.section_id,
            SectionMaster.section_name,
            literal(0).label("experience_years"),
            literal(0).label("experience_months"),
        )
        .select_from(WorkforceAttendance)
        .join(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .outerjoin(
            DepartmentMaster,
            WorkforceAttendance.department_id == DepartmentMaster.department_id,
        )
        .outerjoin(
            SectionMaster,
            EmployeeMaster.section_id == SectionMaster.section_id,
        )
        .where(WorkforceAttendance.work_date == target_date)
    )

    if plant_id:
        stmt = stmt.where(WorkforceAttendance.plant_id == plant_id)
    if shift_id:
        stmt = stmt.where(WorkforceAttendance.shift_id == shift_id)
    if department_id:
        stmt = stmt.where(WorkforceAttendance.department_id == department_id)
    if section_id:
        stmt = stmt.where(EmployeeMaster.section_id == section_id)
    if employee_id:
        stmt = stmt.where(WorkforceAttendance.employee_id == employee_id)

    stmt = stmt.order_by(WorkforceAttendance.employee_id)
    results = db.execute(stmt).mappings().all()
    return [dict(row) for row in results]


def get_team_roster_composition(
    db: Session,
    *,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve team assignments and headcount from employee_master."""
    stmt = (
        select(
            EmployeeMaster.section_id.label("team_id"),
            EmployeeMaster.shift_id.label("home_shift"),
            EmployeeMaster.plant_id,
            func.count(func.distinct(EmployeeMaster.employee_id)).label("employee_count"),
        )
        .where(EmployeeMaster.employment_status.ilike("active"))
    )

    if plant_id:
        stmt = stmt.where(EmployeeMaster.plant_id == plant_id)
    if shift_id:
        stmt = stmt.where(EmployeeMaster.shift_id == shift_id)

    stmt = stmt.group_by(EmployeeMaster.section_id, EmployeeMaster.shift_id, EmployeeMaster.plant_id)
    stmt = stmt.order_by(EmployeeMaster.plant_id, EmployeeMaster.shift_id, EmployeeMaster.section_id)

    rows = db.execute(stmt).mappings().all()
    return [dict(r) for r in rows]


def get_absent_employee_details(
    db: Session,
    *,
    employee_id: str,
    target_date: dt.date,
) -> dict[str, Any] | None:
    """Retrieve absent employee profile, roster information, and date-specific attendance record."""
    stmt = (
        select(
            EmployeeMaster.employee_id,
            EmployeeMaster.full_name.label("employee_name"),
            EmployeeMaster.section_id.label("team_id"),
            EmployeeMaster.designation.label("role"),
            EmployeeMaster.grade.label("skill_grade"),
            literal("").label("certification"),
            EmployeeMaster.shift_id.label("home_shift"),
            EmployeeMaster.employment_status.label("active_status"),
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            SectionMaster.section_id,
            SectionMaster.section_name,
            EmployeeExperience.total_experience_years.label("experience_years"),
            EmployeeExperience.experience_in_company_years.label("experience_months"),
            WorkforceAttendance.work_date,
            WorkforceAttendance.plant_id,
            WorkforceAttendance.shift_id.label("actual_shift"),
            WorkforceAttendance.attendance_status,
            WorkforceAttendance.scheduled_hours,
            WorkforceAttendance.actual_hours,
            WorkforceAttendance.overtime_hours,
            literal("COMPLIANT").label("training_compliance"),
        )
        .select_from(EmployeeMaster)
        .where(EmployeeMaster.employee_id == employee_id)
        .outerjoin(
            DepartmentMaster,
            EmployeeMaster.department_id == DepartmentMaster.department_id,
        )
        .outerjoin(
            SectionMaster,
            EmployeeMaster.section_id == SectionMaster.section_id,
        )
        .outerjoin(
            EmployeeExperience,
            EmployeeMaster.employee_id == EmployeeExperience.employee_id,
        )
        .outerjoin(
            WorkforceAttendance,
            and_(
                EmployeeMaster.employee_id == WorkforceAttendance.employee_id,
                WorkforceAttendance.work_date == target_date,
            ),
        )
    )

    row = db.execute(stmt).mappings().first()
    return dict(row) if row else None


def get_replacement_candidate_pool(
    db: Session,
    *,
    target_plant: str,
    target_date: dt.date,
    exclude_employee_id: str,
    target_role: str,
) -> list[dict[str, Any]]:
    """Retrieve potential replacement candidates within the same plant with matching role,
    including their target-date attendance status, experience, and cumulative overtime.
    """
    ot_subq = (
        select(
            WorkforceAttendance.employee_id,
            func.sum(WorkforceAttendance.overtime_hours).label("total_overtime_hours"),
        )
        .group_by(WorkforceAttendance.employee_id)
        .subquery()
    )

    stmt = (
        select(
            EmployeeMaster.employee_id,
            EmployeeMaster.full_name.label("employee_name"),
            EmployeeMaster.section_id.label("team_id"),
            EmployeeMaster.designation.label("role"),
            EmployeeMaster.grade.label("skill_grade"),
            literal("").label("certification"),
            EmployeeMaster.shift_id.label("home_shift"),
            EmployeeMaster.employment_status.label("active_status"),
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            SectionMaster.section_id,
            SectionMaster.section_name,
            EmployeeExperience.total_experience_years.label("experience_years"),
            EmployeeExperience.experience_in_company_years.label("experience_months"),
            WorkforceAttendance.work_date,
            WorkforceAttendance.plant_id,
            WorkforceAttendance.shift_id.label("target_date_shift"),
            WorkforceAttendance.attendance_status.label("target_date_status"),
            literal("COMPLIANT").label("target_date_compliance"),
            literal("MATCH").label("target_date_skill_match"),
            func.coalesce(ot_subq.c.total_overtime_hours, 0).label("cumulative_overtime_hours"),
        )
        .select_from(EmployeeMaster)
        .join(
            WorkforceAttendance,
            and_(
                EmployeeMaster.employee_id == WorkforceAttendance.employee_id,
                WorkforceAttendance.work_date == target_date,
            ),
        )
        .outerjoin(
            DepartmentMaster,
            EmployeeMaster.department_id == DepartmentMaster.department_id,
        )
        .outerjoin(
            SectionMaster,
            EmployeeMaster.section_id == SectionMaster.section_id,
        )
        .outerjoin(
            EmployeeExperience,
            EmployeeMaster.employee_id == EmployeeExperience.employee_id,
        )
        .outerjoin(ot_subq, EmployeeMaster.employee_id == ot_subq.c.employee_id)
        .where(
            and_(
                WorkforceAttendance.plant_id == target_plant,
                EmployeeMaster.employee_id != exclude_employee_id,
                EmployeeMaster.employment_status.ilike("active"),
                EmployeeMaster.designation == target_role,
            )
        )
        .order_by(EmployeeMaster.employee_id)
    )

    rows = db.execute(stmt).mappings().all()
    return [dict(r) for r in rows]


def get_shift_calendar_day(
    db: Session,
    *,
    calendar_date: dt.date,
) -> list[dict[str, Any]]:
    """Retrieve shift timings and working-day statuses for a given calendar date from shift_master."""
    shifts = db.execute(select(ShiftMaster).order_by(ShiftMaster.shift_id)).scalars().all()
    res = []
    for s in shifts:
        st_parts = [int(p) for p in (s.start_time or "06:00").split(":")]
        et_parts = [int(p) for p in (s.end_time or "14:00").split(":")]
        s_start = dt.datetime.combine(calendar_date, dt.time(st_parts[0], st_parts[1]))
        s_end = dt.datetime.combine(calendar_date, dt.time(et_parts[0], et_parts[1]))
        if s_end <= s_start:
            s_end += dt.timedelta(days=1)
        res.append({
            "calendar_date": calendar_date,
            "shift_id": s.shift_id,
            "shift_start": s_start,
            "shift_end": s_end,
            "planned_minutes": s.planned_minutes,
            "break_minutes": s.break_minutes,
            "is_working_day": True,
        })
    return res
