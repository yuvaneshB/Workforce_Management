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
from app.core.config import get_settings

get_settings.cache_clear()

questions = [
    "Shift C OT spend?",
    "Annual attrition rate?",
    "Innaiku attendance romba low ah iruku, what is the present count?",
    "attendance for plant IN-TN-01 last month",
    "What is our current vendor contractor headcount share?",
]

print("=" * 80)
print("RUNNING 5 REQUIRED QUESTIONS (ONE BY ONE)")
print("=" * 80)

results = []

for idx, q in enumerate(questions, 1):
    print(f"\n--- [{idx}/5] Question: {q} ---")
    conv_id = f"eval_5q_{idx}_{int(time.time()*1000)}"
    t0 = time.perf_counter()
    res = central_agent_orchestrator.execute_query(
        user_query=q,
        conversation_id=conv_id,
    )
    total_ms = round((time.perf_counter() - t0) * 1000, 1)

    # Collect tool calls and args from tool_trace
    tool_trace = res.get("tool_trace") or []
    tools_called = []
    tool_args_list = []
    for t in tool_trace:
        tname = t.get("tool", "")
        targs = t.get("args", {})
        tools_called.append(tname)
        tool_args_list.append({"tool": tname, "args": targs})

    ans = res.get("answer", "")

    record = {
        "index": idx,
        "question": q,
        "total_ms": total_ms,
        "tools_called": tools_called,
        "tool_args": tool_args_list,
        "answer": ans,
    }
    results.append(record)

    print(f"Total ms: {total_ms}")
    print(f"Tools called: {tools_called}")
    print(f"Tool args: {json.dumps(tool_args_list, default=str)}")
    print(f"Final Answer:\n{ans}\n")

# Save to scratch/results_5q.json
out_file = BACKEND_DIR / "scripts" / "results_5q.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, default=str)
print("Saved 5 questions output to", out_file)

