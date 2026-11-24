import json
from pathlib import Path

script_dir = Path(__file__).resolve().parent
with open(script_dir / 'compare_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
q9 = next(d for d in data if d['id'] == 'q09_cross_skills_planning')
print('=== Q9 LLM CALLS TRACE ===')
for idx, c in enumerate(q9.get('llm_calls', []), 1):
    agent = c.get('agent', 'unknown')
    step = c.get('step', '?')
    chars = c.get('prompt_chars', 0)
    dur = c.get('duration_ms', 0.0)
    print(f"{idx}. Agent: {agent:<35} | Step: {step} | Prompt Chars: {chars:>5} | Duration: {dur:>8.1f} ms")

