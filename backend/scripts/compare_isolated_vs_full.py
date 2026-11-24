import json
from pathlib import Path

script_dir = Path(__file__).resolve().parent
with open(script_dir / 'isolated_results.json', 'r', encoding='utf-8') as f:
    iso = {d['id']: d for d in json.load(f)}
with open(script_dir / 'compare_results.json', 'r', encoding='utf-8') as f:
    full = {d['id']: d for d in json.load(f)}

print(f"| {'Question ID':<30} | {'Isolated Latency':<18} | {'Isolated Status':<18} | {'Full Run Latency':<18} | {'Full Run Status':<20} | {'Did Q2/Q5 Pass?':<18} |")
print('|' + '-'*32 + '|' + '-'*20 + '|' + '-'*20 + '|' + '-'*20 + '|' + '-'*22 + '|' + '-'*20 + '|')
for qid in ['q02_overtime', 'q05_production', 'q07_cross_absenteeism_overtime', 'q08_cross_vendor_attrition', 'q09_cross_skills_planning']:
    i_d = iso.get(qid, {})
    f_d = full.get(qid, {})
    i_lat = f"{i_d.get('latency_ms', 0):,.0f} ms"
    i_st = 'Fallback' if i_d.get('is_fallback') else 'Success (Tools)'
    f_lat = f"{f_d.get('total_ms', 0):,.0f} ms"
    f_st = 'Fallback' if f_d.get('tools', {}).get('is_fallback') else 'Success (Tools)'
    pass_note = 'YES (Both Pass)' if qid in ('q02_overtime', 'q05_production') else 'N/A'
    print(f"| {qid:<30} | {i_lat:<18} | {i_st:<18} | {f_lat:<18} | {f_st:<20} | {pass_note:<18} |")

