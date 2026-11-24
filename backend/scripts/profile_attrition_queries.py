import sys
import os
import time
import datetime as dt

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, func, case, desc, text
from app.core.database import db_manager
from app.models.attrition import AttritionTransaction
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.section import SectionMaster
from app.models.vendor import VendorMaster

session = db_manager.readonly_session_local()

def time_query(name, fn):
    t0 = time.perf_counter()
    res = fn()
    dur = round((time.perf_counter() - t0) * 1000, 2)
    print(f"  {name:<25}: {dur:8.2f} ms")
    return res

def test_queries(filters, label):
    print(f"\n--- {label} ---")
    
    # 1. Base totals
    def q1():
        base_stmt = select(
            func.count(AttritionTransaction.attrition_id).label("total_exits"),
            func.count(case((AttritionTransaction.employment_type.ilike("permanent"), 1))).label("permanent_exits"),
            func.count(case((AttritionTransaction.employment_type.ilike("vendor"), 1))).label("vendor_exits"),
            func.coalesce(func.avg(AttritionTransaction.tenure_months), 0.0).label("avg_tenure_months"),
        )
        if filters: base_stmt = base_stmt.where(*filters)
        return session.execute(base_stmt).one()
    r1 = time_query("1. Base totals", q1)

    # 2. Active employees count
    def q2():
        active_stmt = select(func.count(EmployeeMaster.employee_id)).select_from(EmployeeMaster).where(
            EmployeeMaster.employment_status.ilike("active")
        )
        return session.execute(active_stmt).scalar_one()
    r2 = time_query("2. Active count", q2)

    # 3. Monthly trend
    def q3():
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
        if filters: trend_stmt = trend_stmt.where(*filters)
        return session.execute(trend_stmt).all()
    r3 = time_query("3. Monthly trend", q3)

    # 4. By reason
    def q4():
        reason_stmt = (
            select(
                AttritionTransaction.exit_reason,
                func.count(AttritionTransaction.attrition_id).label("cnt"),
            )
            .group_by(AttritionTransaction.exit_reason)
            .order_by(desc("cnt"))
        )
        if filters: reason_stmt = reason_stmt.where(*filters)
        return session.execute(reason_stmt).all()
    r4 = time_query("4. By reason", q4)

    # 5. By dept
    def q5():
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
        if filters: dept_stmt = dept_stmt.where(*filters)
        return session.execute(dept_stmt).all()
    r5 = time_query("5. By dept", q5)

    # 6. By vendor
    def q6():
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
        if filters: vend_stmt = vend_stmt.where(*filters)
        return session.execute(vend_stmt).all()
    r6 = time_query("6. By vendor", q6)

    # 7. By tenure
    def q7():
        tenure_case = case(
            (AttritionTransaction.tenure_months < 12, "< 1 Year"),
            (AttritionTransaction.tenure_months < 24, "1 - 2 Years"),
            (AttritionTransaction.tenure_months < 36, "2 - 3 Years"),
            (AttritionTransaction.tenure_months < 60, "3 - 5 Years"),
            else_="5+ Years",
        )
        tenure_stmt = select(tenure_case.label("band"), func.count(AttritionTransaction.attrition_id).label("cnt")).group_by("band")
        if filters: tenure_stmt = tenure_stmt.where(*filters)
        return session.execute(tenure_stmt).all()
    r7 = time_query("7. By tenure", q7)

    # 8. Exited employee records
    def q8():
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
        if filters: records_stmt = records_stmt.where(*filters)
        return session.execute(records_stmt).all()
    r8 = time_query("8. Exited records (4 joins)", q8)

test_queries([], "Default (No Filters)")
test_queries([
    AttritionTransaction.resignation_date >= dt.date(2025, 10, 1),
    AttritionTransaction.resignation_date <= dt.date(2026, 11, 19)
], "Date Filtered (2025-10-01 to 2026-11-19)")

session.close()
