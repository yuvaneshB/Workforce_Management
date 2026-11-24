"""Benchmark Multi-Agent Supervisor (Tools mode) across 30 operational questions.

Executes questions sequentially in Tools mode only, records latency, tool traces,
verifies grounded numbers against real tool traces, and generates compare_results.json
and compare_report.md.
"""

import concurrent.futures
import json
import os
import re
import sys
import threading
import time
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.core.config import get_settings


def load_questions() -> list[dict[str, Any]]:
    q_file = SCRIPT_DIR / "compare_questions.json"
    if not q_file.exists():
        raise FileNotFoundError(f"Questions file not found: {q_file}")
    with open(q_file, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_text_for_numbers(text: str) -> str:
    """Strip plant/vendor/shift codes, URLs, version strings, dates, and currency symbols."""
    # Strip URLs
    t = re.sub(r"https?://\S+", " ", text)
    # Strip version strings (e.g. v2.14, version 2.14, pydantic 2.14, python 3.11)
    t = re.sub(r"\b(?:v|version|pydantic|python)[-_ ]*\d+(?:\.\d+)+\b", " ", t, flags=re.IGNORECASE)
    # Strip plant codes (e.g., IN-TN-01, IN-KA-01, Plant 1, Plant 2)
    t = re.sub(r"\bIN-[A-Z]{2}-\d{2}\b", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\bPlant[-_ ]?\d{1,2}\b", " ", t, flags=re.IGNORECASE)
    # Strip vendor codes (e.g., V01 to V06, VEND-01 to VEND-06)
    t = re.sub(r"\bV(?:END[-_ ]?)?0[1-9]\b", " ", t, flags=re.IGNORECASE)
    # Strip shift codes (e.g., Shift A, Shift B, Shift C, Shift 1, Shift 2, NS1, NS2, NS3)
    t = re.sub(r"\b(?:Shift|NS)[-_ ]?[A-C1-9]\b", " ", t, flags=re.IGNORECASE)
    # Strip ISO dates (e.g., 2026-08-01, 2026-10-31)
    t = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", " ", t)
    # Strip currency symbols
    t = re.sub(r"[\$₹€£]", " ", t)
    return t


def extract_numbers(text: str) -> list[str]:
    """Extract numeric tokens from text after normalization."""
    t = normalize_text_for_numbers(text)
    raw_tokens = re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\b\d+(?:\.\d+)?%?", t)
    cleaned = []
    for tok in raw_tokens:
        num_str = tok.replace(",", "").rstrip("%")
        if not num_str:
            continue
        # Skip common generic years/numbers like 2026, 2027, or single-digit numbers 1-9, 0
        if num_str in ("2026", "2027", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"):
            continue
        cleaned.append(num_str)
    return list(dict.fromkeys(cleaned))


def extract_sentence_for_token(text: str, token: str) -> str:
    """Find the sentence containing the token."""
    sentences = re.split(r"(?<=[.!?\n])\s+", text)
    for s in sentences:
        if token in s:
            return s.strip()
    return text[:200].strip()


def check_unverified_numbers(answer_text: str, real_tools_trace: list[dict[str, Any]], question: str) -> list[dict[str, str]]:
    """Find numbers present in the answer that do not appear in real tool outputs or the question.

    Returns a list of dicts with {number, sentence, question}.
    """
    answer_numbers = extract_numbers(answer_text)
    trace_blob = json.dumps(real_tools_trace, default=str)
    trace_blob_no_comma = trace_blob.replace(",", " ")
    trace_tokens = re.findall(r"\b\d+(?:\.\d+)?\b", trace_blob.replace(",", ""))
    trace_floats = set()
    for tn in trace_tokens:
        try:
            trace_floats.add(float(tn))
        except ValueError:
            pass

    q_numbers = extract_numbers(question)
    q_blob = normalize_text_for_numbers(question)

    unverified = []
    for num in answer_numbers:
        # Check direct substring in trace blob or question
        if num in trace_blob or num in trace_blob_no_comma or num in q_blob or num in q_numbers:
            continue
        # Check numeric equivalence with rounding and scaling
        try:
            val = float(num)
            val_int_str = str(int(val)) if val.is_integer() else None
            val_1dec = f"{val:.1f}"
            val_2dec = f"{val:.2f}"
            if (val_int_str and val_int_str in trace_blob) or val_1dec in trace_blob or val_2dec in trace_blob:
                continue
            # Tolerance checks: rounding difference <= 1.0 (e.g. 4003532 vs 4003531.96)
            if any(abs(val - tf) <= 1.0 for tf in trace_floats):
                continue
            # Millions scaling (e.g. 1.46M vs 1,460,000, 16.64M vs 16,640,000)
            if any(abs(val * 1e6 - tf) < 50000 or abs(val - tf / 1e6) < 0.05 for tf in trace_floats):
                continue
        except ValueError:
            pass
        unverified.append({
            "number": num,
            "sentence": extract_sentence_for_token(answer_text, num),
            "question": question,
        })

    return unverified


def run_query(query: str, q_id: str, timeout_sec: float = 125.0) -> dict[str, Any]:
    """Execute a single query in tools mode with hard timeout."""
    os.environ["AGENT_MODE"] = "tools"
    os.environ["AGENT_LLM_TIMEOUT_SEC"] = "45.0"
    os.environ["DOMO_TIMEOUT"] = "45.0"
    os.environ["AGENT_TOTAL_TIMEOUT_SEC"] = "75.0"
    os.environ["AGENT_CROSS_DOMAIN_TIMEOUT_SEC"] = "115.0"
    get_settings.cache_clear()

    conv_id = f"cmp_tools_{q_id}_{int(time.time() * 1000)}"

    t0 = time.perf_counter()
    res: dict[str, Any] = {}
    error_msg = None

    ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        fut = ex.submit(
            central_agent_orchestrator.execute_query,
            user_query=query,
            conversation_id=conv_id,
        )
        res = fut.result(timeout=timeout_sec)
    except concurrent.futures.TimeoutError:
        error_msg = f"Timed out after {timeout_sec}s"
    except Exception as exc:
        error_msg = f"Execution error: {type(exc).__name__}: {str(exc)}"
    finally:
        ex.shutdown(wait=False, cancel_futures=True)

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    if error_msg:
        return {
            "mode": "tools",
            "latency_ms": elapsed_ms,
            "error": error_msg,
            "answer": f"Error: {error_msg}",
            "tool_trace": [],
            "tools_used": [],
            "steps": 0,
            "is_fallback": True,
            "fallback_reason": f"harness_timeout: {error_msg}",
            "is_partial": False,
            "partial_reason": None,
            "llm_calls": [],
        }

    raw_answer = res.get("answer", "")
    tool_trace = res.get("tool_trace", [])
    tools_used = res.get("tools_used", [])
    llm_calls = res.get("llm_calls", [])
    is_partial = res.get("is_partial", False)
    partial_reason = res.get("partial_reason")

    is_fallback = False
    fallback_reason = res.get("fallback_reason")
    if res.get("is_fallback") or fallback_reason is not None:
        is_fallback = True
    else:
        evidence_vals = [e.get("value") for e in res.get("evidence", []) if isinstance(e, dict)]
        if not any("Supervisor" in str(v) for v in evidence_vals) and not is_partial:
            is_fallback = True
            if not fallback_reason:
                fallback_reason = "legacy_evidence_detected"

    # Real tools summary (exclude ask_*_agent wrappers)
    real_tools_summary = []
    for t in tool_trace:
        tname = t.get("tool", "")
        if tname and not tname.startswith("ask_") and tname not in real_tools_summary:
            real_tools_summary.append(tname)
    if not real_tools_summary and tools_used:
        real_tools_summary = [str(x) for x in tools_used if not str(x).startswith("ask_")]

    return {
        "mode": "tools",
        "latency_ms": elapsed_ms,
        "error": None,
        "answer": raw_answer,
        "tool_trace": tool_trace,
        "tools_used": real_tools_summary,
        "steps": len(tool_trace) if tool_trace else 1,
        "is_fallback": is_fallback,
        "fallback_reason": fallback_reason,
        "is_partial": is_partial,
        "partial_reason": partial_reason,
        "llm_calls": llm_calls,
    }


def main():
    print("=" * 70)
    print("Workforce Intelligence Agent Mode Benchmark (30 Questions - Tools Mode)")
    print("=" * 70)

    questions = load_questions()
    total_q = len(questions)
    print(f"Loaded {total_q} evaluation questions (sequential, no pauses).\n")

    results = []

    for idx, item in enumerate(questions, 1):
        q_id = item["id"]
        q_text = item["question"]
        category = item.get("category", "")
        domain = item.get("domain", "")
        live_threads = [t for t in threading.enumerate() if t.is_alive()]
        print(f"[{idx}/{total_q}] Testing: '{q_text[:60]}...' ({category}) | live_threads={len(live_threads)}")

        t_res = run_query(q_text, q_id=q_id)
        status_tag = "CLEAN TOOLS"
        if t_res.get("is_partial"):
            status_tag = f"PARTIAL: {t_res.get('partial_reason')}"
        elif t_res.get("is_fallback"):
            status_tag = f"FALLBACK: {t_res.get('fallback_reason')}"
        print(f"     Finished in {t_res['latency_ms']} ms ({status_tag})")

        # Real tools filter (exclude ask_*_agent wrappers)
        real_tools = [t for t in (t_res.get("tool_trace") or []) if not t.get("tool", "").startswith("ask_")]
        real_tool_ms = round(sum(t.get("duration_ms", 0.0) for t in real_tools), 1)

        # Number verification check against real tool traces
        unverified = check_unverified_numbers(t_res.get("answer", ""), real_tools, q_text)
        all_numbers = extract_numbers(t_res.get("answer", ""))

        llm_calls_list = t_res.get("llm_calls") or []
        llm_calls_count = len(llm_calls_list)
        sup_llm_ms = round(sum(c.get("duration_ms", 0.0) for c in llm_calls_list if c.get("agent") in ("supervisor", "supervisor_partial_synthesis")), 1)
        spec_llm_ms = round(sum(c.get("duration_ms", 0.0) for c in llm_calls_list if c.get("agent") not in ("supervisor", "supervisor_partial_synthesis")), 1)

        record = {
            "id": q_id,
            "category": category,
            "domain": domain,
            "question": q_text,
            "live_threads_at_start": len(live_threads),
            "tools": t_res,
            "unverified_numbers": unverified,
            "all_numbers_count": len(all_numbers),
            "llm_calls_count": llm_calls_count,
            "llm_calls": llm_calls_list,
            "supervisor_llm_ms": sup_llm_ms,
            "specialist_llm_ms": spec_llm_ms,
            "tool_ms": real_tool_ms,
            "total_ms": t_res["latency_ms"],
            "is_partial": t_res.get("is_partial", False),
            "partial_reason": t_res.get("partial_reason"),
            "is_fallback": t_res.get("is_fallback", False),
            "fallback_reason": t_res.get("fallback_reason"),
            "real_tools_used": [t.get("tool") for t in real_tools if t.get("tool")],
        }
        results.append(record)
        print(f"     LLM calls: {llm_calls_count} (sup={sup_llm_ms}ms, spec={spec_llm_ms}ms) | real tool={real_tool_ms}ms\n")

    # Save compare_results.json
    results_path = SCRIPT_DIR / "compare_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Saved structured raw metrics to {results_path}")

    # Compute Summary Statistics
    total_count = len(results)
    fallback_count = sum(1 for r in results if r["is_fallback"])
    partial_count = sum(1 for r in results if r["is_partial"])
    clean_count = total_count - fallback_count - partial_count

    fallback_pct = round((fallback_count / total_count) * 100.0, 1) if total_count else 0.0
    partial_pct = round((partial_count / total_count) * 100.0, 1) if total_count else 0.0

    # Number verification totals across non-fallback answers
    non_fallback_results = [r for r in results if not r["is_fallback"]]
    total_numbers_checked = sum(r["all_numbers_count"] for r in non_fallback_results)
    total_unverified = sum(len(r["unverified_numbers"]) for r in non_fallback_results)
    unverified_pct = (
        round((total_unverified / total_numbers_checked * 100.0), 1)
        if total_numbers_checked > 0
        else 0.0
    )

    # Average latency by category
    categories = list(dict.fromkeys(r["category"] for r in results))
    cat_summary = {}
    for cat in categories:
        cat_items = [r for r in results if r["category"] == cat]
        avg_lat = round(sum(r["total_ms"] for r in cat_items) / len(cat_items), 1)
        cat_summary[cat] = {
            "count": len(cat_items),
            "avg_ms": avg_lat,
        }

    overall_avg_ms = round(sum(r["total_ms"] for r in results) / total_count, 1)

    # Collect 3 slowest tool traces across all runs
    all_individual_tool_calls = []
    for r in results:
        for t in r["tools"].get("tool_trace", []):
            if not t.get("tool", "").startswith("ask_"):
                all_individual_tool_calls.append({
                    "qid": r["id"],
                    "tool": t.get("tool"),
                    "duration_ms": t.get("duration_ms", 0.0),
                    "args": t.get("args"),
                    "output_size_bytes": t.get("output_size_bytes", 0),
                })
    all_individual_tool_calls.sort(key=lambda x: x["duration_ms"], reverse=True)
    slowest_3_tools = all_individual_tool_calls[:3]

    # Build Markdown Report
    report_lines = [
        "# Central Workforce Intelligence — 30-Question Benchmark Report",
        "",
        "## 1. Executive Performance Summary",
        "",
        f"- **Total Questions Evaluated**: {total_count}",
        f"- **Overall Average Latency**: **{overall_avg_ms:,.1f} ms**",
        f"- **Clean Tools Success Rate**: **{round(clean_count / total_count * 100, 1)}%** ({clean_count}/{total_count})",
        f"- **Partial Answer Rate (on Timeout)**: **{partial_pct}%** ({partial_count}/{total_count})",
        f"- **Legacy Fallback Rate**: **{fallback_pct}%** ({fallback_count}/{total_count})",
        f"- **Numbers Checked (Non-Fallback Answers)**: {total_numbers_checked}",
        f"- **Unverified Numbers Rate**: **{unverified_pct}%** ({total_unverified}/{total_numbers_checked})",
        "",
        "### Average Latency by Category",
        "",
        "| Category | Question Count | Average Latency (ms) |",
        "| :--- | :---: | :---: |",
    ]

    for cat, info in cat_summary.items():
        report_lines.append(f"| **{cat}** | {info['count']} | **{info['avg_ms']:,.1f} ms** |")

    report_lines.extend([
        "",
        "## 2. Per-Question Detailed Results Table",
        "",
        "| ID | Category | Total (ms) | Tools | LLM Calls | Sup (ms) | Spec (ms) | Tool (ms) | Fallback / Partial Reason |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |",
    ])

    for r in results:
        tot_ms = f"{r['total_ms']:,.0f}"
        tools_cnt = len(r.get("real_tools_used") or [])
        calls = r["llm_calls_count"]
        sup_ms = f"{r['supervisor_llm_ms']:,.0f}"
        spec_ms = f"{r['specialist_llm_ms']:,.0f}"
        tl_ms = f"{r['tool_ms']:,.0f}"
        reason = "None (Clean Tools Mode)"
        if r["is_partial"]:
            reason = f"Partial: {r['partial_reason']}"
        elif r["is_fallback"]:
            reason = f"Fallback: {r['fallback_reason']}"
        report_lines.append(
            f"| {r['id']} | {r['category']} | {tot_ms} | {tools_cnt} | {calls} | {sup_ms} | {spec_ms} | {tl_ms} | {reason} |"
        )

    # Number Check Details
    report_lines.extend([
        "",
        "## 3. Factual Grounding & Unverified Numbers",
        "",
        f"- Total Numbers Checked: {total_numbers_checked}",
        f"- Total Unverified Numbers: {total_unverified} ({unverified_pct}%)",
        "",
    ])

    unverified_found = False
    for r in results:
        if not r["is_fallback"] and r["unverified_numbers"]:
            unverified_found = True
            for u in r["unverified_numbers"]:
                num_val = u.get("number") if isinstance(u, dict) else str(u)
                sent = u.get("sentence", "") if isinstance(u, dict) else ""
                report_lines.append(f"- **{r['id']}** (*\"{r['question'][:60]}...\"*): `{num_val}` — *\"{sent}\"*")
    if not unverified_found:
        report_lines.append("- *All non-fallback answers 100% verified against Neon PostgreSQL tool outputs.*")

    # 3 Slowest Tool Traces
    report_lines.extend([
        "",
        "## 4. Top 3 Slowest Tool Executions",
        "",
        "| Rank | Tool Name | Question ID | Duration (ms) | Output Size (Bytes) | Arguments |",
        "| :---: | :--- | :--- | :---: | :---: | :--- |",
    ])

    for rank, t in enumerate(slowest_3_tools, 1):
        report_lines.append(
            f"| {rank} | `{t['tool']}` | {t['qid']} | **{t['duration_ms']:,.1f} ms** | {t['output_size_bytes']} B | `{json.dumps(t['args'])}` |"
        )

    report_path = SCRIPT_DIR / "compare_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines) + "\n")
    print(f"\nGenerated report at {report_path}")


if __name__ == "__main__":
    main()
