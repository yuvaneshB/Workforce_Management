import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents.specialists import filter_unverified_sentences
from app.agents.tools.specialist_tools import (
    analyze_attendance,
    analyze_attrition,
    analyze_overtime,
    analyze_vendor,
    get_vendor_breakdown,
)

results_file = BACKEND_DIR / "scripts" / "results_5q.json"
with open(results_file, encoding="utf-8") as f:
    data = json.load(f)

# Build tool traces for the 5 questions as they ran originally
tools_map = {
    1: [{"tool": "analyze_overtime", "ok": True, "output": analyze_overtime.invoke({"start_date": "2026-10-01", "end_date": "2026-10-31", "shift_id": "C"})}],
    2: [{"tool": "analyze_attrition", "ok": True, "output": analyze_attrition.invoke({})}],
    3: [{"tool": "analyze_attendance", "ok": True, "output": analyze_attendance.invoke({"start_date": "2026-11-19", "end_date": "2026-11-19"})}],
    4: [{"tool": "analyze_attendance", "ok": True, "output": analyze_attendance.invoke({"start_date": "2026-10-01", "end_date": "2026-10-31", "plant_id": "IN-TN-01"})}],
    5: [
        {"tool": "analyze_vendor", "ok": True, "output": analyze_vendor.invoke({})},
        {"tool": "get_vendor_breakdown", "ok": True, "output": get_vendor_breakdown.invoke({})},
    ],
}

print("=" * 80)
print("STEP 4: filter_unverified_sentences EXECUTION ON 5 EARLIER ANSWERS")
print("=" * 80)

for item in data:
    idx = item["index"]
    q = item["question"]
    ans = item["answer"]
    traces = tools_map[idx]

    filtered = filter_unverified_sentences(ans, traces, q)

    orig_lines = [l.strip() for l in ans.split("\n") if l.strip()]
    filt_lines = [l.strip() for l in filtered.split("\n") if l.strip()]

    removed = [l for l in orig_lines if l not in filt_lines and not l.startswith(("#", "|---", "| :", "---"))]

    print(f"\n--- Question {idx}: \"{q}\" ---")
    print(f"Original length: {len(ans)} chars | Filtered length: {len(filtered)} chars")
    print(f"Removed sentences/lines ({len(removed)}):")
    if not removed:
        print("  (None removed - all sentences fully grounded)")
    for r in removed:
        print(f"  [-] {r}")

