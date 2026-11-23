"""Repository layer for Vendor Workforce analytics, directory, and allocations."""

import datetime as dt
from typing import Any

from sqlalchemy import asc, case, desc, distinct, func, select, text
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.attrition import AttritionTransaction
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.plant_master import PlantMaster
from app.models.section import SectionMaster
from app.models.vendor import EmployeeVendorMapping, VendorMaster


SHIFT_DISPLAY_NAMES = {
    "A": "GS1 (Shift A)",
    "B": "S2 (Shift B)",
    "C": "NS3 (Shift C)",
}


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
) -> dict[str, Any]:
    """Retrieve comprehensive vendor workforce analytics, directory, allocation, attendance, and attrition."""
    # -------------------------------------------------------------------------
    # 1. Base Employee Filters
    # -------------------------------------------------------------------------
    emp_filters = [EmployeeMaster.employment_type == "Vendor"]
    if plant_id:
        emp_filters.append(EmployeeMaster.plant_id == plant_id)
    if department_id:
        emp_filters.append(EmployeeMaster.department_id == department_id)
    if section_id:
        emp_filters.append(EmployeeMaster.section_id == section_id)
    if shift_id:
        emp_filters.append(EmployeeMaster.shift_id == shift_id)
    if vendor_id:
        emp_filters.append(EmployeeMaster.vendor_id == vendor_id)

    # -------------------------------------------------------------------------
    # 2. Vendor Directory & Core KPIs
    # -------------------------------------------------------------------------
    v_stmt = select(VendorMaster).order_by(asc(VendorMaster.vendor_id))
    if vendor_id:
        v_stmt = v_stmt.where(VendorMaster.vendor_id == vendor_id)
    all_vendors = list(db.execute(v_stmt).scalars().all())

    # Aggregated counts per vendor
    agg_stmt = (
        select(
            EmployeeMaster.vendor_id,
            func.count(distinct(EmployeeMaster.employee_id)).label("total"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("active"), EmployeeMaster.employee_id))
                )
            ).label("assigned"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("resigned"), EmployeeMaster.employee_id))
                )
            ).label("unassigned"),
        )
        .where(*emp_filters)
        .group_by(EmployeeMaster.vendor_id)
    )
    v_counts = {
        r[0]: {"total": int(r[1]), "assigned": int(r[2]), "unassigned": int(r[3])}
        for r in db.execute(agg_stmt).all()
        if r[0] is not None
    }

    # Associated plants and department counts per vendor
    plants_depts_stmt = (
        select(
            EmployeeMaster.vendor_id,
            func.string_agg(distinct(EmployeeMaster.plant_id), ", ").label("plants"),
            func.count(distinct(EmployeeMaster.department_id)).label("dept_count"),
        )
        .where(*emp_filters)
        .group_by(EmployeeMaster.vendor_id)
    )
    v_meta = {
        r[0]: {"plants": r[1] or "", "dept_count": int(r[2] or 0)}
        for r in db.execute(plants_depts_stmt).all()
        if r[0] is not None
    }

    vendor_items = []
    tot_vendor_employees = 0
    tot_assigned = 0
    tot_unassigned = 0
    active_vendors_count = 0

    for v in all_vendors:
        counts = v_counts.get(v.vendor_id, {"total": 0, "assigned": 0, "unassigned": 0})
        meta = v_meta.get(v.vendor_id, {"plants": "", "dept_count": 0})

        # If a filter is applied and this vendor has 0 matching employees, skip in filtered view if vendor_id is not specifically chosen
        if (plant_id or department_id or section_id or shift_id) and counts["total"] == 0:
            continue

        tot_vendor_employees += counts["total"]
        tot_assigned += counts["assigned"]
        tot_unassigned += counts["unassigned"]

        is_active = (v.contract_status or "").strip().lower() == "active"
        if is_active:
            active_vendors_count += 1

        dept_label = f"{meta['dept_count']} Departments" if meta["dept_count"] > 0 else "—"

        vendor_items.append(
            {
                "vendor_id": v.vendor_id,
                "vendor_name": v.vendor_name,
                "total_employees": counts["total"],
                "assigned_employees": counts["assigned"],
                "unassigned_employees": counts["unassigned"],
                "plant": meta["plants"] or "—",
                "department": dept_label,
                "status": v.contract_status or "Active",
                "service_category": v.service_category,
                "contact_person": v.contact_person,
                "city": v.city,
                "state": v.state,
                "performance_rating": v.performance_rating,
                "payment_terms_days": v.payment_terms_days,
                "contract_start": v.contract_start,
                "contract_end": v.contract_end,
            }
        )

    kpis = {
        "total_vendor_employees": tot_vendor_employees,
        "active_vendors": active_vendors_count,
        "assigned_employees": tot_assigned,
        "unassigned_employees": tot_unassigned,
    }

    # -------------------------------------------------------------------------
    # 3. Vendor Workforce Allocation
    # -------------------------------------------------------------------------
    # 3a. By Plant
    plant_alloc_stmt = (
        select(
            EmployeeMaster.plant_id.label("id"),
            coalesce_plant_name(),
            func.count(distinct(EmployeeMaster.employee_id)).label("total"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("active"), EmployeeMaster.employee_id))
                )
            ).label("assigned"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("resigned"), EmployeeMaster.employee_id))
                )
            ).label("unassigned"),
        )
        .select_from(EmployeeMaster)
        .outerjoin(PlantMaster, EmployeeMaster.plant_id == PlantMaster.plant_id)
        .where(*emp_filters)
        .group_by(EmployeeMaster.plant_id, PlantMaster.plant_name)
        .order_by(desc("total"))
    )
    by_plant = [
        {
            "id": r[0],
            "label": r[1] or r[0],
            "total": int(r[2]),
            "assigned": int(r[3]),
            "unassigned": int(r[4]),
            "percentage": round((int(r[2]) / max(1, tot_vendor_employees)) * 100, 1),
        }
        for r in db.execute(plant_alloc_stmt).all()
    ]

    # 3b. By Department
    dept_alloc_stmt = (
        select(
            EmployeeMaster.department_id.label("id"),
            coalesce_dept_name(),
            func.count(distinct(EmployeeMaster.employee_id)).label("total"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("active"), EmployeeMaster.employee_id))
                )
            ).label("assigned"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("resigned"), EmployeeMaster.employee_id))
                )
            ).label("unassigned"),
        )
        .select_from(EmployeeMaster)
        .outerjoin(DepartmentMaster, EmployeeMaster.department_id == DepartmentMaster.department_id)
        .where(*emp_filters)
        .group_by(EmployeeMaster.department_id, DepartmentMaster.department_name)
        .order_by(desc("total"))
    )
    by_department = [
        {
            "id": r[0],
            "label": r[1] or r[0],
            "total": int(r[2]),
            "assigned": int(r[3]),
            "unassigned": int(r[4]),
            "percentage": round((int(r[2]) / max(1, tot_vendor_employees)) * 100, 1),
        }
        for r in db.execute(dept_alloc_stmt).all()
    ]

    # 3c. By Section
    sec_alloc_stmt = (
        select(
            EmployeeMaster.section_id.label("id"),
            coalesce_section_name(),
            func.count(distinct(EmployeeMaster.employee_id)).label("total"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("active"), EmployeeMaster.employee_id))
                )
            ).label("assigned"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("resigned"), EmployeeMaster.employee_id))
                )
            ).label("unassigned"),
        )
        .select_from(EmployeeMaster)
        .outerjoin(SectionMaster, EmployeeMaster.section_id == SectionMaster.section_id)
        .where(*emp_filters)
        .group_by(EmployeeMaster.section_id, SectionMaster.section_name)
        .order_by(desc("total"))
        .limit(15)
    )
    by_section = [
        {
            "id": r[0],
            "label": r[1] or r[0],
            "total": int(r[2]),
            "assigned": int(r[3]),
            "unassigned": int(r[4]),
            "percentage": round((int(r[2]) / max(1, tot_vendor_employees)) * 100, 1),
        }
        for r in db.execute(sec_alloc_stmt).all()
    ]

    # 3d. By Shift
    shift_alloc_stmt = (
        select(
            EmployeeMaster.shift_id.label("id"),
            func.count(distinct(EmployeeMaster.employee_id)).label("total"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("active"), EmployeeMaster.employee_id))
                )
            ).label("assigned"),
            func.count(
                distinct(
                    case((EmployeeMaster.employment_status.ilike("resigned"), EmployeeMaster.employee_id))
                )
            ).label("unassigned"),
        )
        .where(*emp_filters)
        .group_by(EmployeeMaster.shift_id)
        .order_by(asc("id"))
    )
    by_shift = [
        {
            "id": r[0],
            "label": SHIFT_DISPLAY_NAMES.get(r[0], f"Shift {r[0]}"),
            "total": int(r[1]),
            "assigned": int(r[2]),
            "unassigned": int(r[3]),
            "percentage": round((int(r[1]) / max(1, tot_vendor_employees)) * 100, 1),
        }
        for r in db.execute(shift_alloc_stmt).all()
    ]

    allocation = {
        "by_plant": by_plant,
        "by_department": by_department,
        "by_section": by_section,
        "by_shift": by_shift,
    }

    # -------------------------------------------------------------------------
    # 4. Vendor Attendance Summary & Trend
    # -------------------------------------------------------------------------
    att_filters = [EmployeeMaster.employment_type == "Vendor"]
    if start_date:
        att_filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date:
        att_filters.append(WorkforceAttendance.work_date <= end_date)
    if plant_id:
        att_filters.append(WorkforceAttendance.plant_id == plant_id)
    if department_id:
        att_filters.append(WorkforceAttendance.department_id == department_id)
    if shift_id:
        att_filters.append(WorkforceAttendance.shift_id == shift_id)
    if vendor_id:
        att_filters.append(EmployeeMaster.vendor_id == vendor_id)

    att_summary_stmt = (
        select(
            func.count().label("total"),
            func.count(case((WorkforceAttendance.attendance_status == "Present", 1))).label("present"),
            func.count(case((WorkforceAttendance.attendance_status == "Absent", 1))).label("absent"),
            func.count(case((WorkforceAttendance.attendance_status == "Leave", 1))).label("leave"),
            func.count(case((WorkforceAttendance.late_minutes > 0, 1))).label("late"),
        )
        .select_from(WorkforceAttendance)
        .join(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .where(*att_filters)
    )
    att_row = db.execute(att_summary_stmt).one()
    att_tot = int(att_row.total or 0)
    att_pres = int(att_row.present or 0)
    att_abs = int(att_row.absent or 0)
    att_leave = int(att_row.leave or 0)
    att_late = int(att_row.late or 0)
    att_pct = round((att_pres / att_tot) * 100, 1) if att_tot > 0 else 0.0

    # Trend grouping
    period_lower = period.lower().strip()
    if period_lower == "weekly":
        date_col = func.to_char(func.date_trunc("week", WorkforceAttendance.work_date), 'YYYY-"W"IW').label("date_label")
    elif period_lower == "monthly":
        date_col = func.to_char(func.date_trunc("month", WorkforceAttendance.work_date), "YYYY-MM").label("date_label")
    else:
        date_col = func.to_char(WorkforceAttendance.work_date, "YYYY-MM-DD").label("date_label")

    att_trend_stmt = (
        select(
            date_col,
            func.count().label("total"),
            func.count(case((WorkforceAttendance.attendance_status == "Present", 1))).label("present"),
            func.count(case((WorkforceAttendance.attendance_status == "Absent", 1))).label("absent"),
            func.count(case((WorkforceAttendance.attendance_status == "Leave", 1))).label("leave"),
            func.count(case((WorkforceAttendance.late_minutes > 0, 1))).label("late"),
        )
        .select_from(WorkforceAttendance)
        .join(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .where(*att_filters)
        .group_by(text("1"))
        .order_by(text("1 ASC"))
    )
    att_trend_rows = db.execute(att_trend_stmt).all()
    trend_points = [
        {
            "date": str(r[0]),
            "total": int(r[1]),
            "present": int(r[2]),
            "absent": int(r[3]),
            "leave": int(r[4]),
            "late": int(r[5]),
            "attendance_pct": round((int(r[2]) / max(1, int(r[1]))) * 100, 1),
        }
        for r in att_trend_rows
    ]

    attendance_summary = {
        "present_count": att_pres,
        "absent_count": att_abs,
        "leave_count": att_leave,
        "late_count": att_late,
        "attendance_pct": att_pct,
        "trend": trend_points,
    }

    # -------------------------------------------------------------------------
    # 5. Vendor Attrition Summary
    # -------------------------------------------------------------------------
    attr_filters = [AttritionTransaction.vendor_id.is_not(None)]
    if plant_id:
        attr_filters.append(AttritionTransaction.plant_id == plant_id)
    if department_id:
        attr_filters.append(AttritionTransaction.department_id == department_id)
    if section_id:
        attr_filters.append(AttritionTransaction.section_id == section_id)
    if vendor_id:
        attr_filters.append(AttritionTransaction.vendor_id == vendor_id)

    attr_count_stmt = select(func.count(AttritionTransaction.attrition_id)).where(*attr_filters)
    total_exits = int(db.execute(attr_count_stmt).scalar_one())

    # 5a. Monthly trends
    month_stmt = (
        select(
            func.to_char(AttritionTransaction.resignation_date, "YYYY-MM").label("month"),
            func.count(AttritionTransaction.attrition_id).label("exits"),
        )
        .where(*attr_filters)
        .group_by(text("1"))
        .order_by(text("1 ASC"))
    )
    monthly_trends = [
        {"month": str(r[0]), "exits": int(r[1])}
        for r in db.execute(month_stmt).all()
    ]

    # 5b. By Vendor
    vm_lookup = {v.vendor_id: v.vendor_name for v in all_vendors}
    vend_exit_stmt = (
        select(
            AttritionTransaction.vendor_id,
            func.count(AttritionTransaction.attrition_id).label("exits"),
        )
        .where(*attr_filters)
        .group_by(AttritionTransaction.vendor_id)
        .order_by(desc("exits"))
    )
    by_vendor_exits = [
        {
            "key": str(r[0]),
            "label": vm_lookup.get(str(r[0]), str(r[0])),
            "exits": int(r[1]),
            "percentage": round((int(r[1]) / max(1, total_exits)) * 100, 1),
        }
        for r in db.execute(vend_exit_stmt).all()
    ]

    # 5c. By Plant
    pm_lookup = {
        p.plant_id: p.plant_name
        for p in db.execute(select(PlantMaster)).scalars().all()
    }
    plant_exit_stmt = (
        select(
            AttritionTransaction.plant_id,
            func.count(AttritionTransaction.attrition_id).label("exits"),
        )
        .where(*attr_filters)
        .group_by(AttritionTransaction.plant_id)
        .order_by(desc("exits"))
    )
    by_plant_exits = [
        {
            "key": str(r[0]),
            "label": pm_lookup.get(str(r[0]), str(r[0])),
            "exits": int(r[1]),
            "percentage": round((int(r[1]) / max(1, total_exits)) * 100, 1),
        }
        for r in db.execute(plant_exit_stmt).all()
    ]

    # 5d. By Department
    dm_lookup = {
        d.department_id: d.department_name
        for d in db.execute(select(DepartmentMaster)).scalars().all()
    }
    dept_exit_stmt = (
        select(
            AttritionTransaction.department_id,
            func.count(AttritionTransaction.attrition_id).label("exits"),
        )
        .where(*attr_filters)
        .group_by(AttritionTransaction.department_id)
        .order_by(desc("exits"))
    )
    by_dept_exits = [
        {
            "key": str(r[0]),
            "label": dm_lookup.get(str(r[0]), str(r[0])),
            "exits": int(r[1]),
            "percentage": round((int(r[1]) / max(1, total_exits)) * 100, 1),
        }
        for r in db.execute(dept_exit_stmt).all()
    ]

    # 5e. Exit Reasons
    reasons_stmt = (
        select(
            AttritionTransaction.exit_reason,
            func.count(AttritionTransaction.attrition_id).label("count"),
        )
        .where(*attr_filters)
        .group_by(AttritionTransaction.exit_reason)
        .order_by(desc("count"))
    )
    exit_reasons = [
        {
            "reason": str(r[0] or "Unknown"),
            "count": int(r[1]),
            "percentage": round((int(r[1]) / max(1, total_exits)) * 100, 1),
        }
        for r in db.execute(reasons_stmt).all()
    ]

    attrition_summary = {
        "total_exits": total_exits,
        "monthly_trends": monthly_trends,
        "by_vendor": by_vendor_exits,
        "by_plant": by_plant_exits,
        "by_department": by_dept_exits,
        "exit_reasons": exit_reasons,
    }

    return {
        "kpis": kpis,
        "vendors": vendor_items,
        "allocation": allocation,
        "attendance": attendance_summary,
        "attrition": attrition_summary,
    }


def coalesce_plant_name():
    """SQL expression returning PlantMaster.plant_name or fallback to plant_id."""
    return func.coalesce(PlantMaster.plant_name, EmployeeMaster.plant_id).label("label")


def coalesce_dept_name():
    """SQL expression returning DepartmentMaster.department_name or fallback to department_id."""
    return func.coalesce(DepartmentMaster.department_name, EmployeeMaster.department_id).label("label")


def coalesce_section_name():
    """SQL expression returning SectionMaster.section_name or fallback to section_id."""
    return func.coalesce(SectionMaster.section_name, EmployeeMaster.section_id).label("label")

