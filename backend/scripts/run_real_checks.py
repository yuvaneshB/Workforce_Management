import asyncio
import json
import time
import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.agents.central_agent_orchestrator import central_agent_orchestrator

QUESTIONS = [
    "Annual attrition rate?",
    "Shift C OT spend?",
    "attendance for plant IN-TN-01 last month",
    "Who is the best employee?",
]

async def run_query(q: str):
    print(f"\n=======================================================")
    print(f"QUERY: {q}")
    print(f"=======================================================")
    t0 = time.time()
    events = []
    tools_called = []
    final_answer = ""
    
    async for chunk in central_agent_orchestrator.stream_orchestration(user_query=q):
        for line in chunk.split("\n"):
            if line.startswith("data: "):
                data_str = line[6:].strip()
                if not data_str:
                    continue
                try:
                    ev = json.loads(data_str)
                    events.append(ev)
                    ev_type = ev.get("event")
                    if ev_type in ("stage_start", "stage_end"):
                        msg = ev.get("message", "")
                        tool = ev.get("tool")
                        if tool and tool not in tools_called:
                            tools_called.append(tool)
                    elif ev_type == "done":
                        res = ev.get("result", {})
                        final_answer = res.get("answer", "")
                        traces = res.get("tool_trace", [])
                        for t in traces:
                            t_name = t.get("tool")
                            if t_name and t_name not in tools_called:
                                tools_called.append(t_name)
                except Exception as err:
                    print(f"Error parsing SSE chunk: {err}")

    elapsed_ms = int((time.time() - t0) * 1000)
    print(f"TOTAL MS: {elapsed_ms}")
    print(f"TOOLS CALLED: {tools_called}")
    print(f"FIRST 300 CHARS OF ANSWER:\n{final_answer[:300]}")
    return {
        "query": q,
        "total_ms": elapsed_ms,
        "tools_called": tools_called,
        "answer_first_300": final_answer[:300],
    }

async def main():
    results = []
    for q in QUESTIONS:
        res = await run_query(q)
        results.append(res)
    
    print("\n\n### SUMMARY RESULTS JSON ###")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())

