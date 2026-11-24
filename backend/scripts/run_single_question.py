"""Run a single question in tools mode and output structured JSON result."""

import json
import os
import sys
import threading
import time
from pathlib import Path

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.core.config import get_settings


def main():
    if len(sys.argv) < 2:
        print("Usage: run_single_question.py <q_id>")
        sys.exit(1)

    target_id = sys.argv[1].strip()
    q_file = SCRIPT_DIR / "compare_questions.json"
    with open(q_file, "r", encoding="utf-8") as f:
        questions = json.load(f)

    match = next((q for q in questions if q["id"] == target_id), None)
    if not match:
        print(f"Question with id '{target_id}' not found.")
        sys.exit(1)

    os.environ["AGENT_MODE"] = "tools"
    get_settings.cache_clear()

    q_text = match["question"]
    conv_id = f"iso_tools_{target_id}_{int(time.time() * 1000)}"

    live_threads_at_start = len([t for t in threading.enumerate() if t.is_alive()])
    t0 = time.perf_counter()
    try:
        res = central_agent_orchestrator.execute_query(
            user_query=q_text,
            conversation_id=conv_id,
        )
    except Exception as exc:
        res = {
            "error": str(exc),
            "is_fallback": True,
            "fallback_reason": f"exception: {exc}",
            "answer": f"Error: {exc}",
            "tool_trace": [],
            "llm_calls": [],
        }

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    is_fb = res.get("is_fallback", False)
    if not is_fb:
        evidence_vals = [e.get("value") for e in res.get("evidence", []) if isinstance(e, dict)]
        if "Multi-Agent Supervisor (Tools)" not in evidence_vals:
            is_fb = True

    tool_trace = res.get("tool_trace") or []
    llm_calls = res.get("llm_calls") or []

    sup_llm_ms = round(sum(c.get("duration_ms", 0.0) for c in llm_calls if c.get("agent") == "supervisor"), 1)
    spec_llm_ms = round(sum(c.get("duration_ms", 0.0) for c in llm_calls if c.get("agent") != "supervisor"), 1)
    tool_ms = round(sum(t.get("duration_ms", 0.0) for t in tool_trace), 1)

    out = {
        "id": target_id,
        "question": q_text,
        "category": match.get("category"),
        "latency_ms": elapsed_ms,
        "is_fallback": is_fb,
        "fallback_reason": res.get("fallback_reason"),
        "live_threads_at_start": live_threads_at_start,
        "tools_used": res.get("tools_used") or [t.get("tool") for t in tool_trace if t.get("tool")],
        "llm_calls_count": len(llm_calls),
        "supervisor_llm_ms": sup_llm_ms,
        "specialist_llm_ms": spec_llm_ms,
        "tool_ms": tool_ms,
        "answer_preview": (res.get("answer") or "")[:200],
    }

    print("---RESULT_START---")
    print(json.dumps(out, default=str))
    print("---RESULT_END---")


if __name__ == "__main__":
    main()

