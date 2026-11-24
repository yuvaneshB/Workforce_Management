import json
from pathlib import Path

script_dir = Path(__file__).resolve().parent
with open(script_dir / 'compare_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

targets = [
    'q06_skill',
    'q20_attendance_tanglish',
    'q21_attendance_typo',
    'q22_overtime_short',
    'q24_attrition_tanglish',
    'q25_attrition_short',
    'q26_vendor_tanglish',
    'q28_skill_short',
    'q30_planning_tanglish'
]

for qid in targets:
    item = next((d for d in data if d['id'] == qid), None)
    if not item:
        continue
    tools_res = item.get('tools', {})
    print('=' * 80)
    print(f"ID: {qid}")
    print(f"Question: {item.get('question')}")
    print(f"Tools Used: {tools_res.get('tools_used')}")
    print(f"Real Tools: {item.get('real_tools_used')}")
    print(f"LLM Calls: {item.get('llm_calls_count')}")
    ans = tools_res.get('answer', '')
    print(f"Answer Length: {len(ans)}")
    print(f"Answer:\n{ans}\n")

