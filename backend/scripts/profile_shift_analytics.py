import time
from pathlib import Path
import sys

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import db_manager
from sqlalchemy import text

with db_manager.readonly_session_local() as session:
    print("=== PROFILING get_shift_analytics ===")
    
    # 1. Profile the existing tool execution
    from app.agents.tools.workforce_tools import get_shift_analytics
    t0 = time.perf_counter()
    res_orig = get_shift_analytics.invoke({})
    orig_dur = round((time.perf_counter() - t0) * 1000, 1)
    print(f"Original get_shift_analytics() duration: {orig_dur} ms")
    print(f"Result: {res_orig}\n")

    # 2. EXPLAIN ANALYZE on shift breakdown
    sql = text("""
        EXPLAIN ANALYZE
        SELECT 
            shift_id,
            COUNT(*) as total,
            SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent
        FROM attendance_transactions
        GROUP BY shift_id
        ORDER BY shift_id;
    """)
    explain_res = session.execute(sql).fetchall()
    print("=== EXPLAIN ANALYZE on Shift Breakdown SQL ===")
    for row in explain_res:
        print(row[0])

    # 3. Test direct targeted query for get_shift_analytics
    t0 = time.perf_counter()
    shift_sql = text("""
        SELECT 
            shift_id,
            COUNT(*) as total_records,
            SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count
        FROM attendance_transactions
        WHERE (CAST(:shift_id AS VARCHAR) IS NULL OR shift_id = :shift_id)
          AND (CAST(:start_date AS DATE) IS NULL OR work_date >= :start_date)
          AND (CAST(:end_date AS DATE) IS NULL OR work_date <= :end_date)
        GROUP BY shift_id
        ORDER BY shift_id;
    """)
    shift_rows = session.execute(shift_sql, {
        "shift_id": None,
        "start_date": None,
        "end_date": None,
    }).fetchall()
    
    hc_sql = text("""
        SELECT shift_id, COUNT(*) 
        FROM employee_master 
        WHERE is_active = true 
        GROUP BY shift_id;
    """)
    hc_rows = dict(session.execute(hc_sql).fetchall())
    
    items = []
    for r in shift_rows:
        s_id = str(r[0])
        tot = int(r[1])
        pres = int(r[2] or 0)
        ab = int(r[3] or 0)
        att_pct = round(pres * 100.0 / tot, 1) if tot > 0 else 0.0
        abs_pct = round(ab * 100.0 / tot, 1) if tot > 0 else 0.0
        items.append({
            "shift_id": s_id,
            "headcount": hc_rows.get(s_id, 0),
            "present_count": pres,
            "absent_count": ab,
            "total_records": tot,
            "attendance_percentage": att_pct,
            "absenteeism_percentage": abs_pct,
        })
    new_res = {
        "status": "success",
        "total_shifts": len(items),
        "shifts": items,
        "filters_applied": {
            "start_date": None,
            "end_date": None,
            "shift_id": None,
        }
    }
    new_dur = round((time.perf_counter() - t0) * 1000, 1)
    print(f"\nTargeted query duration: {new_dur} ms")
    print(f"Targeted Result: {new_res}")
