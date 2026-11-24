import json

with open("backend/scripts/compare_results.json", "r", encoding="utf-8") as f:
    results = json.load(f)

target_ids = ["q06", "q20", "q21", "q22", "q24", "q25", "q26", "q28", "q30"]
for r in results:
    for tid in target_ids:
        if r["id"].startswith(tid):
            q = r["question"]
            ans = r["tools"]["answer"]
            tools_used = r["real_tools_used"]
            print(f"=== {r['id']} ===")
            print(f"Question: {q}")
            print(f"Tools Used: {tools_used}")
            print(f"Answer:\n{ans[:300]}...\n")

