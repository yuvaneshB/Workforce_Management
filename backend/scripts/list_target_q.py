import json

with open("backend/scripts/compare_questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

target_ids = ["q06", "q20", "q21", "q22", "q24", "q25", "q26", "q28", "q30"]
for q in questions:
    for tid in target_ids:
        if q["id"].startswith(tid):
            print(f"{q['id']}: {q['question']}")

