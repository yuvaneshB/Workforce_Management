"""Run questions Q2, Q5, Q7, Q8, Q9 one at a time in separate processes with 30s pause between each."""

import json
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PYTHON_EXE = sys.executable

TARGET_QUESTIONS = [
    "q02_overtime",
    "q05_production",
    "q07_cross_absenteeism_overtime",
    "q08_cross_vendor_attrition",
    "q09_cross_skills_planning",
]


def main():
    results = []
    print("=" * 70)
    print("Running Isolated Questions (Q2, Q5, Q7, Q8, Q9) with 30s Pauses")
    print("=" * 70)

    for i, q_id in enumerate(TARGET_QUESTIONS, 1):
        print(f"\n[{i}/{len(TARGET_QUESTIONS)}] Running isolated question: {q_id} in separate process...")
        t0 = time.time()
        proc = subprocess.run(
            [PYTHON_EXE, "-u", str(SCRIPT_DIR / "run_single_question.py"), q_id],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        dur = round(time.time() - t0, 1)

        raw_stdout = proc.stdout
        if "---RESULT_START---" in raw_stdout and "---RESULT_END---" in raw_stdout:
            json_str = raw_stdout.split("---RESULT_START---")[1].split("---RESULT_END---")[0].strip()
            res_obj = json.loads(json_str)
        else:
            res_obj = {
                "id": q_id,
                "error": f"Process exited with code {proc.returncode}. Stderr: {proc.stderr[:300]}",
                "is_fallback": True,
                "fallback_reason": f"Process failure: {proc.stderr[:100]}",
                "latency_ms": dur * 1000,
            }

        results.append(res_obj)
        fb_text = "FALLBACK" if res_obj.get("is_fallback") else "CLEAN TOOLS MODE"
        print(f"     Finished in {res_obj.get('latency_ms')} ms ({fb_text})")
        if res_obj.get("fallback_reason"):
            print(f"     Fallback reason: {res_obj.get('fallback_reason')}")

        if i < len(TARGET_QUESTIONS):
            print(f"     Sleeping 30s before next question to prevent API rate limits / queueing...")
            time.sleep(30)

    out_file = SCRIPT_DIR / "isolated_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved isolated results to {out_file}")

    print("\n" + "=" * 70)
    print("ISOLATED TEST RESULTS SUMMARY")
    print("=" * 70)
    print(f"| {'ID':<30} | {'Latency (ms)':<14} | {'Status':<18} | {'Fallback Reason':<30} |")
    print("|" + "-" * 32 + "|" + "-" * 16 + "|" + "-" * 20 + "|" + "-" * 32 + "|")
    for r in results:
        st = "Fallback" if r.get("is_fallback") else "Success (Tools)"
        fb = r.get("fallback_reason") or "None"
        lat = f"{r.get('latency_ms', 0):,.0f}"
        print(f"| {r['id']:<30} | {lat:<14} | {st:<18} | {fb[:30]:<30} |")


if __name__ == "__main__":
    main()

