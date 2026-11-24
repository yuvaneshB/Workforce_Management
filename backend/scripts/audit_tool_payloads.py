"""Audit payload size of every tool in AGENT_TOOLSETS."""

import json
import sys
from pathlib import Path

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents.tools.specialist_tools import AGENT_TOOLSETS


def main():
    seen = set()
    results = []
    for domain, tools in AGENT_TOOLSETS.items():
        for t in tools:
            name = getattr(t, "name", str(t))
            if name in seen:
                continue
            seen.add(name)
            try:
                args = {}
                if name == "recommend_replacement_employees":
                    args = {"employee_id": "EMP-0001"}
                if hasattr(t, "invoke"):
                    out = t.invoke(args)
                elif callable(t):
                    out = t(**args)
                else:
                    out = "Not callable"
                size_bytes = len(json.dumps(out, default=str).encode("utf-8"))
                kb = round(size_bytes / 1024, 2)
                print(f"[AUDIT] {name:<35} | {domain:<20} | {size_bytes:<8} B | {kb:<6} KB", flush=True)
                results.append((name, domain, size_bytes, kb, "OK"))
            except Exception as e:
                print(f"[AUDIT] {name:<35} | {domain:<20} | ERROR: {type(e).__name__}: {str(e)[:40]}", flush=True)
                results.append((name, domain, 0, 0.0, f"Error: {type(e).__name__}: {str(e)[:60]}"))

    print(f"| {'Tool Name':<35} | {'Domain':<20} | {'Bytes':<8} | {'Size (KB)':<10} | {'Status':<10} |")
    print("|" + "-" * 37 + "|" + "-" * 22 + "|" + "-" * 10 + "|" + "-" * 12 + "|" + "-" * 12 + "|")
    for name, domain, b, kb, st in sorted(results, key=lambda x: x[2], reverse=True):
        print(f"| {name:<35} | {domain:<20} | {b:<8} | {kb:<10} | {st:<10} |")


if __name__ == "__main__":
    main()
