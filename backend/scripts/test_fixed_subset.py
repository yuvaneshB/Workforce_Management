import json
import os
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["AGENT_MODE"] = "tools"

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.core.config import get_settings

with open(BACKEND_DIR / "scripts" / "compare_questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

target_ids = ["q06", "q20", "q21", "q22", "q24", "q25", "q26", "q28", "q30"]
target_questions = [q for q in questions if any(q["id"].startswith(tid) for tid in target_ids)]

print(f"Running {len(target_questions)} target questions...")

for q in target_questions:
    qid = q["id"]
    qtext = q["question"]
    print("=" * 70)
    print(f"ID: {qid}")
    print(f"Question: {qtext}")
    t0 = time.perf_counter()
    res = central_agent_orchestrator.execute_query(
        user_query=qtext,
        conversation_id=f"test_subset_{qid}_{int(time.time()*1000)}",
    )
    dur = (time.perf_counter() - t0) * 1000
    real_tools = [t.get("tool") for t in res.get("tool_trace", [])]
    print(f"Duration: {dur:.1f}ms")
    print(f"Tool Trace: {real_tools}")
    print(f"Answer:\n{res.get('answer', '')}")

