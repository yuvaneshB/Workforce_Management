import json
import os
import sys
import time
from pathlib import Path

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.core.config import get_settings

os.environ["AGENT_MODE"] = "tools"
get_settings.cache_clear()

with open(SCRIPT_DIR / "compare_questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

for target_id in ["q07_cross_absenteeism_overtime", "q09_cross_skills_planning"]:
    match = next(q for q in questions if q["id"] == target_id)
    q_text = match["question"]
    print("=" * 70)
    print(f"Testing {target_id}: '{q_text}'")
    print("=" * 70)
    t0 = time.perf_counter()
    res = central_agent_orchestrator.execute_query(q_text, conversation_id=f"test_{target_id}_{int(time.time())}")
    dur_ms = round((time.perf_counter() - t0) * 1000, 1)

    llm_calls = res.get("llm_calls", [])
    print(f"Result Status: {res.get('status')} | is_partial: {res.get('is_partial')} | is_fallback: {res.get('is_fallback')} | Total Latency: {dur_ms} ms")
    print(f"Total LLM Calls: {len(llm_calls)}")
    print("Per-call breakdown:")
    for idx, c in enumerate(llm_calls, 1):
        agent = c.get("agent", "unknown")
        step = c.get("step", "?")
        chars = c.get("prompt_chars", 0)
        dur = c.get("duration_ms", 0.0)
        print(f"  {idx}. Agent: {agent:<35} | Step: {step} | Prompt Chars: {chars:>5} | Duration: {dur:>8.1f} ms")
    
    real_tools = [t for t in res.get("tool_trace", []) if not t.get("tool", "").startswith("ask_")]
    print(f"Real Tools Executed ({len(real_tools)}): {[t.get('tool') for t in real_tools]}")
    tool_dur = sum(t.get("duration_ms", 0.0) for t in real_tools)
    print(f"Real Tool Duration: {tool_dur:,.1f} ms")
    print(f"Answer Preview:\n{(res.get('answer') or '')[:300]}...\n")

