import sys
import os
import time
import json

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

queries = ["Annual attrition rate?", "Hi"]

for query in queries:
    print(f"\n==================== QUERY: '{query}' ====================")
    t0 = time.time()
    with client.stream("POST", "/api/v1/agent/chat-stream", json={"message": query, "user_query": query}) as response:
        for line in response.iter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]
                try:
                    ev = json.loads(data_str)
                except Exception:
                    continue
                elapsed = round(time.time() - t0, 2)
                name = ev.get("event")
                msg = ev.get("message")
                if not msg and name == "done":
                    ans = ev.get("result", {}).get("answer", "")
                    first_line = ans.strip().split("\n")[0] if ans else "Completed"
                    msg = first_line[:120]
                elif not msg and name == "init":
                    msg = ev.get("title", "Initialized")
                print(f"{elapsed:6.2f}s | {name:<12} | {msg}")
