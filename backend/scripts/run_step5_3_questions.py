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

target_questions = [
    "Shift C OT spend?",
    "Plant 1 overtime hours last month",
    "What is our current vendor contractor headcount share?",
]

print("=" * 80)
print("RUNNING 3 REQUIRED STEP 5 QUESTIONS")
print("=" * 80)

results = []

for idx, q in enumerate(target_questions, 1):
    print(f"\n==================================================")
    print(f"[{idx}/3] QUESTION: {q}")
    print(f"==================================================")
    conv_id = f"eval_step5_{idx}_{int(time.time()*1000)}"
    t0 = time.perf_counter()
    res = central_agent_orchestrator.execute_query(
        user_query=q,
        conversation_id=conv_id,
    )
    total_ms = round((time.perf_counter() - t0) * 1000, 1)

    tool_trace = res.get("tool_trace") or []
    tool_args_list = []
    for t in tool_trace:
        tname = t.get("tool", "")
        targs = t.get("args", {})
        tool_args_list.append({"tool": tname, "args": targs})

    ans = res.get("answer", "")

    record = {
        "index": idx,
        "question": q,
        "total_ms": total_ms,
        "tool_args": tool_args_list,
        "answer": ans,
    }
    results.append(record)

    print(f"TOTAL MS: {total_ms}")
    print(f"TOOL ARGS: {json.dumps(tool_args_list, indent=2, default=str)}")
    print(f"FINAL ANSWER:\n{ans}\n")

out_file = BACKEND_DIR / "scripts" / "results_step5.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, default=str)
print("Saved Step 5 results to", out_file)

