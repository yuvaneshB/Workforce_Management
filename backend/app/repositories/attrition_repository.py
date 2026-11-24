"""Read-only repository for public.attrition_transactions and attrition analytics."""

import datetime as dt
from sqlalchemy import asc, case, desc, func, select
from sqlalchemy.orm import Session

from app.models.attrition import AttritionTransaction
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.section import SectionMaster
from app.models.vendor import VendorMaster

REASON_COLORS = [
    "#6F3DBA",
    "#4D8EEB",
    "#F58A3A",
    "#E45C72",
    "#31B7C3",
    "#0E9C86",
    "#B88943",
    "#8A63D2",
    "#3E7BC4",
    "#D9701F",
    "#2BC0A6",
    "#FF7D90",
    "#A684EE",
    "#78ACF5",
    "#5932EA",
]


def get_attrition_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    shift_id: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
    team_id: str | None = None,
) -> dict:
    """Compute aggregated attrition metrics, trends, breakdown categories and exit records."""
    filters = []
    if plant_id:
        filters.append(AttritionTransaction.plant_id == plant_id)
    if department_id:
        filters.append(AttritionTransaction.department_id == department_id)
    if section_id:
        filters.append(AttritionTransaction.section_id == section_id)
    if team_id and team_id.strip():
        filters.append(AttritionTransaction.section_id == team_id.strip())
    if start_date:
        filters.append(AttritionTransaction.resignation_date >= start_date)
    if end_date:
        filters.append(AttritionTransaction.resignation_date <= end_date)
    if employment_type and employment_type.strip():
        filters.append(AttritionTransaction.employment_type.ilike(employment_type.strip()))
    if vendor_id and vendor_id.strip():
        filters.append(AttritionTransaction.vendor_id == vendor_id.strip())
    if shift_id and shift_id.strip():
        filters.append(
            AttritionTransaction.employee_id.in_(
                select(EmployeeMaster.employee_id).where(EmployeeMaster.shift_id == shift_id.strip())
            )
        )

    # Base query for totals
    base_stmt = select(
        func.count(AttritionTransaction.attrition_id).label("total_exits"),
        func.count(
            case((AttritionTransaction.employment_type.ilike("permanent"), 1))
        ).label("permanent_exits"),
        func.count(
            case((AttritionTransaction.employment_type.ilike("vendor"), 1))
        ).label("vendor_exits"),
        func.coalesce(func.avg(AttritionTransaction.tenure_months), 0.0).label("avg_tenure_months"),
    )
    if filters:
        base_stmt = base_stmt.where(*filters)

    row = db.execute(base_stmt).one()
    total_exits = int(row.total_exits)
    permanent_exits = int(row.permanent_exits)
    vendor_exits = int(row.vendor_exits)
    avg_tenure_months = float(row.avg_tenure_months)
    avg_tenure_years = round(avg_tenure_months / 12.0, 1)

    # Active employees count from employee_master (applying plant/dept/section filter)
    emp_filters = [EmployeeMaster.employment_status.ilike("active")]
    if plant_id:
        emp_filters.append(EmployeeMaster.plant_id == plant_id)
    if department_id:
        emp_filters.append(EmployeeMaster.department_id == department_id)
    if section_id:
        emp_filters.append(EmployeeMaster.section_id == section_id)
    if shift_id:
        emp_filters.append(EmployeeMaster.shift_id == shift_id)
    if employment_type and employment_type.strip():
        emp_filters.append(EmployeeMaster.employment_type.ilike(employment_type.strip()))
    if vendor_id and vendor_id.strip():
        emp_filters.append(EmployeeMaster.vendor_id == vendor_id.strip())

    active_count_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(*emp_filters)
    active_employees = int(db.execute(active_count_stmt).scalar_one() or 0)

    denominator = active_employees + total_exits
    overall_attrition_rate = round((total_exits / denominator * 100.0), 1) if denominator > 0 else 0.0
    retention_rate = round(100.0 - overall_attrition_rate, 1)
    retained_employees = active_employees

    permanent_pct = round((permanent_exits / total_exits * 100.0), 1) if total_exits > 0 else 0.0
    vendor_pct = round((vendor_exits / total_exits * 100.0), 1) if total_exits > 0 else 0.0

    summary = {
        "total_exits": total_exits,
        "total_exits_change_pct": 0.0,
        "overall_attrition_rate": overall_attrition_rate,
        "attrition_rate_change_pp": 0.0,
        "permanent_exits": permanent_exits,
        "permanent_pct": permanent_pct,
        "vendor_exits": vendor_exits,
        "vendor_pct": vendor_pct,
        "average_tenure_years": avg_tenure_years,
        "tenure_change_years": 0.0,
        "active_employees": active_employees,
        "retained_employees": retained_employees,
        "retention_rate": retention_rate,
    }

    # Monthly Trend
    month_col = func.to_char(AttritionTransaction.resignation_date, "YYYY-MM")
    trend_stmt = (
        select(
            month_col.label("month_key"),
            func.count(AttritionTransaction.attrition_id).label("total_exits"),
            func.count(case((AttritionTransaction.employment_type.ilike("permanent"), 1))).label("perm_exits"),
            func.count(case((AttritionTransaction.employment_type.ilike("vendor"), 1))).label("vend_exits"),
        )
        .group_by(month_col)
        .order_by(month_col)
    )
    if filters:
        trend_stmt = trend_stmt.where(*filters)

    monthly_trend = []
    for t_row in db.execute(trend_stmt).all():
        m_key = str(t_row.month_key)
        # Parse month name like 'Oct 2025'
        try:
            m_dt = dt.datetime.strptime(m_key, "%Y-%m")
            label = m_dt.strftime("%b %Y")
        except Exception:
            label = m_key
        t_total = int(t_row.total_exits)
        t_perm = int(t_row.perm_exits)
        t_vend = int(t_row.vend_exits)
        monthly_trend.append({
            "month": label,
            "label": label,
            "total_exits": t_total,
            "permanent_exits": t_perm,
            "vendor_exits": t_vend,
            "attrition_rate": round((t_total / denominator * 100.0), 1) if denominator > 0 else 0.0,
        })

    # By Reason
    reason_stmt = (
        select(
            AttritionTransaction.exit_reason,
            func.count(AttritionTransaction.attrition_id).label("cnt"),
        )
        .group_by(AttritionTransaction.exit_reason)
        .order_by(desc("cnt"))
    )
    if filters:
        reason_stmt = reason_stmt.where(*filters)

    by_reason = []
    for idx, r_row in enumerate(db.execute(reason_stmt).all()):
        r_name = str(r_row[0])
        r_count = int(r_row[1])
        pct_val = f"{(r_count / total_exits * 100.0):.1f}%" if total_exits > 0 else "0.0%"
        by_reason.append({
            "reason": r_name,
            "count": r_count,
            "pct": pct_val,
            "color": REASON_COLORS[idx % len(REASON_COLORS)],
        })

    # By Department
    dept_stmt = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.count(AttritionTransaction.attrition_id).label("cnt"),
        )
        .join(DepartmentMaster, AttritionTransaction.department_id == DepartmentMaster.department_id)
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
        .order_by(desc("cnt"))
    )
    if filters:
        dept_stmt = dept_stmt.where(*filters)

    by_department = []
    for d_row in db.execute(dept_stmt).all():
        d_id = str(d_row[0])
        d_name = str(d_row[1])
        d_count = int(d_row[2])
        d_pct = f"{(d_count / total_exits * 100.0):.1f}%" if total_exits > 0 else "0.0%"
        by_department.append({
            "department": d_name,
            "department_id": d_id,
            "count": d_count,
            "pct": d_pct,
            "label": f"{d_count} ({d_pct})",
        })

    # By Vendor
    vend_stmt = (
        select(
            AttritionTransaction.vendor_id,
            func.coalesce(VendorMaster.vendor_name, "Permanent Staff").label("v_name"),
            func.count(AttritionTransaction.attrition_id).label("cnt"),
        )
        .outerjoin(VendorMaster, AttritionTransaction.vendor_id == VendorMaster.vendor_id)
        .group_by(AttritionTransaction.vendor_id, VendorMaster.vendor_name)
        .order_by(desc("cnt"))
    )
    if filters:
        vend_stmt = vend_stmt.where(*filters)

    by_vendor = []
    for v_row in db.execute(vend_stmt).all():
        v_id = str(v_row[0]) if v_row[0] else None
        v_name = str(v_row[1])
        v_count = int(v_row[2])
        v_pct = f"{(v_count / total_exits * 100.0):.1f}%" if total_exits > 0 else "0.0%"
        by_vendor.append({
            "vendor": v_name,
            "vendor_id": v_id,
            "count": v_count,
            "pct": v_pct,
            "label": f"{v_count} ({v_pct})",
        })

    # By Tenure Band
    tenure_case = case(
        (AttritionTransaction.tenure_months < 12, "< 1 Year"),
        (AttritionTransaction.tenure_months < 24, "1 - 2 Years"),
        (AttritionTransaction.tenure_months < 36, "2 - 3 Years"),
        (AttritionTransaction.tenure_months < 60, "3 - 5 Years"),
        else_="5+ Years",
    )
    tenure_stmt = (
        select(
            tenure_case.label("band"),
            func.count(AttritionTransaction.attrition_id).label("cnt"),
        )
        .group_by("band")
    )
    if filters:
        tenure_stmt = tenure_stmt.where(*filters)

    tenure_order = ["< 1 Year", "1 - 2 Years", "2 - 3 Years", "3 - 5 Years", "5+ Years"]
    tenure_dict = {r[0]: int(r[1]) for r in db.execute(tenure_stmt).all()}
    by_tenure = []
    for band in tenure_order:
        b_count = tenure_dict.get(band, 0)
        b_pct = f"{(b_count / total_exits * 100.0):.1f}%" if total_exits > 0 else "0.0%"
        by_tenure.append({
            "band": band,
            "count": b_count,
            "pct": b_pct,
            "label": f"{b_count} ({b_pct})",
        })

    # Exited employee records
    records_stmt = (
        select(
            AttritionTransaction.attrition_id,
            AttritionTransaction.employee_id,
            func.coalesce(EmployeeMaster.full_name, AttritionTransaction.employee_id).label("employee_name"),
            AttritionTransaction.plant_id,
            DepartmentMaster.department_name,
            AttritionTransaction.department_id,
            SectionMaster.section_name,
            AttritionTransaction.section_id,
            AttritionTransaction.designation,
            AttritionTransaction.employment_type,
            func.coalesce(VendorMaster.vendor_name, "-").label("vendor_name"),
            AttritionTransaction.tenure_months,
            AttritionTransaction.resignation_date,
            AttritionTransaction.last_working_day,
            AttritionTransaction.exit_reason,
            AttritionTransaction.exit_type,
            AttritionTransaction.regrettable_loss,
        )
        .outerjoin(EmployeeMaster, AttritionTransaction.employee_id == EmployeeMaster.employee_id)
        .outerjoin(DepartmentMaster, AttritionTransaction.department_id == DepartmentMaster.department_id)
        .outerjoin(SectionMaster, AttritionTransaction.section_id == SectionMaster.section_id)
        .outerjoin(VendorMaster, AttritionTransaction.vendor_id == VendorMaster.vendor_id)
        .order_by(desc(AttritionTransaction.resignation_date))
    )
    if filters:
        records_stmt = records_stmt.where(*filters)

    exited_records = []
    for rec in db.execute(records_stmt).all():
        exited_records.append({
            "attrition_id": str(rec.attrition_id),
            "employee_id": str(rec.employee_id),
            "employee_name": str(rec.employee_name),
            "plant_id": str(rec.plant_id),
            "department": str(rec.department_name or rec.department_id),
            "department_id": str(rec.department_id),
            "section": str(rec.section_name or rec.section_id),
            "section_id": str(rec.section_id),
            "designation": str(rec.designation),
            "employment_type": str(rec.employment_type),
            "vendor": str(rec.vendor_name),
            "tenure_months": float(rec.tenure_months),
            "resignation_date": str(rec.resignation_date),
            "last_working_day": str(rec.last_working_day),
            "exit_reason": str(rec.exit_reason),
            "exit_type": str(rec.exit_type),
            "regrettable_loss": str(rec.regrettable_loss),
        })

    return {
        "summary": summary,
        "monthly_trend": monthly_trend,
        "weekly_trend": [],
        "daily_trend": [],
        "by_reason": by_reason,
        "by_department": by_department,
        "by_vendor": by_vendor,
        "by_tenure": by_tenure,
        "exited_records": exited_records,
    }

