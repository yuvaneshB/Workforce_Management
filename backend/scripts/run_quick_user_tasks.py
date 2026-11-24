import json
import os
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["AGENT_MODE"] = "tools"
os.environ["AGENT_LLM_TIMEOUT_SEC"] = "60.0"
os.environ["DOMO_TIMEOUT"] = "60.0"
os.environ["AGENT_TOTAL_TIMEOUT_SEC"] = "100.0"
os.environ["AGENT_CROSS_DOMAIN_TIMEOUT_SEC"] = "120.0"

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.agents.tools.specialist_tools import analyze_attendance

print("=" * 80)
print("RUNNING STEP 2: attendance for plant IN-TN-01 last month")
print("=" * 80)

q2 = "attendance for plant IN-TN-01 last month"
conv_id_2 = f"eval_att_{int(time.time()*1000)}"
res2 = central_agent_orchestrator.execute_query(user_query=q2, conversation_id=conv_id_2)

tool_trace_2 = res2.get("tool_trace") or []
tool_args_2 = []
att_tool_output = None
for t in tool_trace_2:
    tool_args_2.append({"tool": t.get("tool"), "args": t.get("args")})
    if t.get("tool") == "analyze_attendance":
        att_tool_output = t.get("output")

# If analyze_attendance was inside ask_attendance_agent or called directly:
if not att_tool_output:
    att_tool_output = analyze_attendance.invoke({"start_date": "2026-10-01", "end_date": "2026-10-31", "plant_id": "IN-TN-01"})

metrics2 = att_tool_output.get("metrics", {}) if isinstance(att_tool_output, dict) else {}
working_rate = metrics2.get("attendance_rate_working_days")
total_rate = metrics2.get("attendance_rate_total_records") or metrics2.get("attendance_rate")
sev2 = att_tool_output.get("severity") if isinstance(att_tool_output, dict) else None

print("\n--- STEP 2 RESULTS ---")
print("TOOL ARGS:", json.dumps(tool_args_2, indent=2))
print("ATTENDANCE RATE (WORKING DAYS):", working_rate, "%")
print("ATTENDANCE RATE (TOTAL RECORDS):", total_rate, "%")
print("SEVERITY:", sev2)
print("FINAL ANSWER:\n", res2.get("answer"))

print("\n" + "=" * 80)
print("RUNNING STEP 5: What is our current vendor contractor headcount share?")
print("=" * 80)

q5 = "What is our current vendor contractor headcount share?"
conv_id_5 = f"eval_vnd_{int(time.time()*1000)}"
res5 = central_agent_orchestrator.execute_query(user_query=q5, conversation_id=conv_id_5)

print("\n--- STEP 5 RESULTS ---")
print("FINAL ANSWER:\n", res5.get("answer"))

