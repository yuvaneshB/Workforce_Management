import urllib.request
import json
import sys

BASE_URL = 'http://127.0.0.1:8000/api/v1'

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode())

passed = 0
failed = 0

def check(name, condition, extra=''):
    global passed, failed
    if condition:
        print(f'  [PASS] {name} {extra}', flush=True)
        passed += 1
    else:
        print(f'  [FAIL] {name} {extra}', flush=True)
        failed += 1

print('=== 1. Existing Workforce Tab Endpoints ===', flush=True)
st, summary = get_json(f'{BASE_URL}/workforce/summary')
check('Workforce summary status 200', st == 200)
check('Total employees in DB', summary['total_employees'] == 1700, f"got {summary['total_employees']}")
st, emps = get_json(f'{BASE_URL}/employees?limit=5')
check('Employees list status 200', st == 200)
check('Employees total', emps['pagination']['total'] == 1700)

print('\n=== 2 & 3. Vendor Overview & KPI Calculations ===', flush=True)
st, vo = get_json(f'{BASE_URL}/workforce/vendor-overview')
check('Vendor overview status 200', st == 200)
kpis = vo['kpis']
check('Total Vendor Employees == 647', kpis['total_vendor_employees'] == 647, f"got {kpis['total_vendor_employees']}")
check('Active Vendors == 5', kpis['active_vendors'] == 5, f"got {kpis['active_vendors']}")
check('Assigned Employees == 573', kpis['assigned_employees'] == 573, f"got {kpis['assigned_employees']}")
check('Unassigned Employees == 74', kpis['unassigned_employees'] == 74, f"got {kpis['unassigned_employees']}")
check('Sum Assigned + Unassigned == Total', kpis['assigned_employees'] + kpis['unassigned_employees'] == kpis['total_vendor_employees'])

print('\n=== 4. Vendor Directory & Search ===', flush=True)
vendors = vo['vendors']
check('All 6 vendors present', len(vendors) == 6)
v_ids = [v['vendor_id'] for v in vendors]
check('Vendor IDs V01-V06 present', set(v_ids) == {'V01', 'V02', 'V03', 'V04', 'V05', 'V06'})
v01 = next(v for v in vendors if v['vendor_id'] == 'V01')
check('V01 name', v01['vendor_name'] == 'Sri Vignesh Manpower Services')
check('V01 counts: 117 total, 96 assigned, 21 unassigned', v01['total_employees'] == 117 and v01['assigned_employees'] == 96 and v01['unassigned_employees'] == 21)

print('\n=== 5. Employee-to-Vendor Mapping & Vendor Employees Directory ===', flush=True)
st, v_emps = get_json(f'{BASE_URL}/employees?employment_type=Vendor&vendor_id=V01&limit=5')
check('V01 employees status 200', st == 200)
check('V01 total employees == 117', v_emps['pagination']['total'] == 117)
first_emp = v_emps['items'][0]
check('Enriched vendor_name', first_emp.get('vendor_name') == 'Sri Vignesh Manpower Services')
check('Enriched department_name', bool(first_emp.get('department_name')))
check('Enriched section_name', bool(first_emp.get('section_name')))
check('Required columns present', all(k in first_emp for k in ['employee_id', 'employee_name', 'plant_id', 'role', 'skill_grade', 'home_shift', 'active_status']))

print('\n=== 6. Plant & Department Filters ===', flush=True)
st, tn_vo = get_json(f'{BASE_URL}/workforce/vendor-overview?plant_id=IN-TN-01')
check('TN plant vendor total == 367', tn_vo['kpis']['total_vendor_employees'] == 367)
check('TN plant assigned == 323', tn_vo['kpis']['assigned_employees'] == 323)
check('TN plant unassigned == 44', tn_vo['kpis']['unassigned_employees'] == 44)
st, ka_vo = get_json(f'{BASE_URL}/workforce/vendor-overview?plant_id=IN-KA-01')
check('KA plant vendor total == 280', ka_vo['kpis']['total_vendor_employees'] == 280)
check('KA plant assigned == 250', ka_vo['kpis']['assigned_employees'] == 250)
check('KA plant unassigned == 30', ka_vo['kpis']['unassigned_employees'] == 30)

print('\n=== 7. Allocation Calculations ===', flush=True)
alloc = vo['allocation']
plant_sum = sum(p['total'] for p in alloc['by_plant'])
check('Plant allocation sum == 647', plant_sum == 647)
dept_sum = sum(d['total'] for d in alloc['by_department'])
check('Dept allocation sum == 647', dept_sum == 647)
shift_sum = sum(s['total'] for s in alloc['by_shift'])
check('Shift allocation sum == 647', shift_sum == 647)

print('\n=== 8. Attendance Analytics (Daily, Weekly, Monthly) ===', flush=True)
att = vo['attendance']
check('Attendance pct ~ 66.8%', att['attendance_pct'] == 66.8, f"got {att['attendance_pct']}")
check('Present count > 0', att['present_count'] > 0)
check('Absent count > 0', att['absent_count'] > 0)
st, wk_vo = get_json(f'{BASE_URL}/workforce/vendor-overview?period=weekly')
check('Weekly attendance points returned', len(wk_vo['attendance']['trend']) > 0)
st, mo_vo = get_json(f'{BASE_URL}/workforce/vendor-overview?period=monthly')
check('Monthly attendance points returned', len(mo_vo['attendance']['trend']) > 0)

print('\n=== 9. Attrition Analytics ===', flush=True)
atr = vo['attrition']
check('Total vendor exits == 74', atr['total_exits'] == 74, f"got {atr['total_exits']}")
check('Monthly exit trends returned', len(atr['monthly_trends']) > 0)
check('Exits by vendor returned (6 vendors)', len(atr['by_vendor']) == 6)
check('Top exit reason Absconding (No Contact)', atr['exit_reasons'][0]['reason'] == 'Absconding (No Contact)')

print('\n=== 10. Vendor Detail Drawer Support ===', flush=True)
st, v_detail = get_json(f'{BASE_URL}/workforce/vendor-overview?vendor_id=V01')
check('V01 detail status 200', st == 200)
check('V01 detail kpis total == 117', v_detail['kpis']['total_vendor_employees'] == 117)
check('V01 detail exits == 21', v_detail['attrition']['total_exits'] == 21)

print('\n=== 11. Empty and Edge States ===', flush=True)
st, empty_vo = get_json(f'{BASE_URL}/workforce/vendor-overview?plant_id=NON_EXISTENT')
check('Non-existent plant status 200 (graceful empty state)', st == 200)
check('Non-existent plant kpis total == 0', empty_vo['kpis']['total_vendor_employees'] == 0)

print('\n=== 12. Existing Attendance & Shifts Tabs Remain Functional ===', flush=True)
st, att_recs = get_json(f'{BASE_URL}/attendance?limit=5')
check('Attendance records endpoint status 200', st == 200)
st, att_an = get_json(f'{BASE_URL}/analytics/attendance?start_date=2026-08-01&end_date=2026-10-31&period=daily')
check('Attendance analytics endpoint status 200', st == 200)
st, shifts = get_json(f'{BASE_URL}/shifts?limit=5')
check('Shifts endpoint status 200', st == 200)

print(f'\n========================================', flush=True)
print(f'TEST RESULTS: {passed} PASSED, {failed} FAILED', flush=True)
print(f'========================================', flush=True)
if failed > 0:
    sys.exit(1)
