import sys
import os
import time
import datetime as dt

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import db_manager, get_readonly_db
from app.repositories import attrition_repository
from app.agents.attrition_agent_service import attrition_agent_service

session_factory = db_manager.readonly_session_local
session = session_factory()

def profile_run(s_date_str, e_date_str, label):
    print(f"\n==========================================")
    print(f"PROFILING ATTRITION: {label} (start={s_date_str}, end={e_date_str})")
    print(f"==========================================")
    
    t0 = time.perf_counter()
    res = attrition_agent_service.execute_attrition_analysis(
        session,
        start_date=s_date_str,
        end_date=e_date_str,
        skip_llm=True
    )
    total_ms = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Total execute_attrition_analysis time: {total_ms} ms")
    print(f"Summary total exits: {res.get('summary', {}).get('total_exits')}")
    print(f"Stages:")
    for st in res.get("stages", []):
        print(f"  Stage {st.get('stage')}: {st.get('name')} took {st.get('duration_ms')} ms")

# Profile 1: Default args (None, None)
profile_run(None, None, "Default args (None, None)")

# Profile 2: 2025-10-01 to 2026-11-19
profile_run("2025-10-01", "2026-11-19", "Date filtered (2025-10-01 to 2026-11-19)")

session.close()

