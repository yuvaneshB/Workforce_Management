"""Focused unit and integration tests for Phase 2: Workforce Planning Backend Service & API.

Covers:
- Workforce Availability Calculations (/api/v1/planning/availability)
- ABSENT and LEAVE exclusion
- LATE employee handling and policy
- Filter validation (plant, shift, department, section)
- Empty data and out-of-range date handling
- Workforce Shortage Detection (/api/v1/planning/shortages)
- 30-person plant-shift and 180-person factory baselines
- Team composition validation (10 emps/team)
- Role-specific shortages and limitations documentation
- Employee Replacement Recommendations (/api/v1/planning/recommendations)
- Plant isolation enforcement
- Shift conflict and already-working exclusion
- Rest turnaround interval validation (fatigue prevention)
- Skill grade requirement (candidate grade >= absent grade)
- Certification and training compliance (CURRENT required)
- Deterministic scoring and experience/overtime ranking
- No-candidate scenario handling
- 404 for unknown employee and 400 for invalid filters
- Read-only query behavior
"""

import datetime as dt
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ============================================================================
# 1. Workforce Availability Tests
# ============================================================================

def test_workforce_availability_factory_wide(client):
    """Verify factory-wide availability calculation for a verified date."""
    res = client.get("/api/v1/planning/availability?date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    assert data["date"] == "2026-08-01"
    assert data["total_scheduled"] == 180
    assert data["present_count"] > 0
    assert data["absent_count"] > 0
    assert data["leave_count"] >= 0
    assert data["late_count"] >= 0

    # Policy verification: available_count must strictly equal present_count
    assert data["available_count"] == data["present_count"]
    assert data["potential_total_with_late"] == data["present_count"] + data["late_count"]

    # Sum of all statuses must equal total scheduled (no double counting)
    total_tally = data["present_count"] + data["absent_count"] + data["leave_count"] + data["late_count"]
    assert total_tally == data["total_scheduled"]

    # Rate verification
    expected_avail_rate = round((data["present_count"] / 180.0) * 100.0, 1)
    assert data["availability_rate"] == expected_avail_rate

    # Late policy must be documented explicitly
    assert "late_policy" in data
    assert "Late employees are tracked separately" in data["late_policy"]


def test_workforce_availability_filtered_by_plant_and_shift(client):
    """Verify availability filtered by plant and shift conforms to the 30-employee roster."""
    res = client.get("/api/v1/planning/availability?date=2026-08-01&plant_id=IN-TN-01&shift_id=A")
    assert res.status_code == 200
    data = res.json()

    assert data["plant_id"] == "IN-TN-01"
    assert data["shift_id"] == "A"
    assert data["total_scheduled"] == 30  # 3 teams x 10 members
    assert data["present_count"] == 26
    assert data["absent_count"] == 1
    assert data["leave_count"] == 1
    assert data["late_count"] == 2
    assert data["available_count"] == 26
    assert data["potential_total_with_late"] == 28


def test_workforce_availability_filtered_by_department_and_section(client):
    """Verify availability filtered by department and section."""
    res = client.get("/api/v1/planning/availability?date=2026-08-01&department_id=DEPT-01")
    assert res.status_code == 200
    data = res.json()
    assert data["department_id"] == "DEPT-01"
    assert data["total_scheduled"] == 54  # Production department has 54 employees

    res_sec = client.get("/api/v1/planning/availability?date=2026-08-01&section_id=SEC-01")
    assert res_sec.status_code == 200
    data_sec = res_sec.json()
    assert data_sec["section_id"] == "SEC-01"
    assert data_sec["total_scheduled"] == 30  # SEC-01 has 30 mapped employees


def test_workforce_availability_invalid_filters(client):
    """Verify HTTP 400 on invalid plant or shift identifiers."""
    res_plant = client.get("/api/v1/planning/availability?date=2026-08-01&plant_id=PLANT-99")
    assert res_plant.status_code == 400
    assert "Invalid plant_id" in res_plant.json()["detail"]

    res_shift = client.get("/api/v1/planning/availability?date=2026-08-01&shift_id=X")
    assert res_shift.status_code == 400
    assert "Invalid shift_id" in res_shift.json()["detail"]


def test_workforce_availability_out_of_range_date(client):
    """Verify clean response when no records exist for the specified date."""
    res = client.get("/api/v1/planning/availability?date=1999-01-01")
    assert res.status_code == 200
    data = res.json()
    assert data["total_scheduled"] == 0
    assert data["available_count"] == 0
    assert "No attendance records found" in data["message"]


# ============================================================================
# 2. Workforce Shortage Detection Tests
# ============================================================================

def test_workforce_shortages_plant_shift_baseline(client):
    """Verify shortage calculation against the 30-person operational baseline."""
    res = client.get("/api/v1/planning/shortages?date=2026-08-01&plant_id=IN-TN-01&shift_id=A")
    assert res.status_code == 200
    data = res.json()

    assert data["date"] == "2026-08-01"
    assert data["plant_id"] == "IN-TN-01"
    assert data["shift_id"] == "A"
    assert data["required_baseline"] == 30
    assert data["available_workforce"] == 26
    assert data["shortage_count"] == 4
    assert data["shortage_percentage"] == 13.3
    assert data["severity"] == "MODERATE"
    assert data["team_composition_validated"] is True
    assert len(data["scheduled_teams"]) == 3
    for team in data["scheduled_teams"]:
        assert team["is_standard_size"] is True
        assert team["headcount"] == 10

    # Role shortages must be present
    assert "role_shortages" in data
    assert "Maintenance Technician" in data["role_shortages"]

    # Limitations note
    assert "limitations" in data
    assert "role_quotas" in data["limitations"]


def test_workforce_shortages_factory_wide(client):
    """Verify shortage detection against the 180-person factory baseline."""
    res = client.get("/api/v1/planning/shortages?date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    assert data["required_baseline"] == 180
    assert data["available_workforce"] == data["required_baseline"] - data["shortage_count"]
    assert data["shortage_count"] == data["absent_count"] + data["leave_count"] + data["late_count"]
    assert len(data["scheduled_teams"]) == 18


# ============================================================================
# 3. Employee Replacement Recommendations & Phase 3 Validation Tests
# ============================================================================

def test_replacement_recommendations_mandatory_certification_emp0018(client):
    """Verify Phase 3 Critical Certification Rule for absent worker EMP-0018 (Forklift L4).

    EMP-0018 is a Maintenance Technician L4 requiring 'Forklift' certification in plant IN-TN-01.
    In Phase 2, EMP-0052 (IPC-A-610) was erroneously recommended with 10 cert points.
    In Phase 3:
    1. With mandatory_certification=True (default), EMP-0052 is disqualified due to certification mismatch.
    2. Since no available L4 Maintenance Tech in IN-TN-01 holds Forklift, eligible_candidates_count must be 0.
    3. Disqualified list explicitly documents certification mismatch for EMP-0052.
    """
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0018&date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    # Absent employee verification
    absent = data["absent_employee"]
    assert absent["employee_id"] == "EMP-0018"
    assert absent["employee_name"] == "Arun Das"
    assert absent["role"] == "Maintenance Technician"
    assert absent["skill_grade"] == "L4"
    assert absent["certification"] == "Forklift"
    assert absent["plant_id"] == "IN-TN-01"
    assert absent["target_shift"] == "A"
    assert absent["attendance_status"] == "ABSENT"

    # Strict mandatory certification check: 0 eligible candidates
    assert data["mandatory_certification"] is True
    assert data["eligible_candidates_count"] == 0
    assert len(data["candidates"]) == 0
    assert "No eligible replacement candidates found" in data["message"]

    # Disqualified summary verification
    assert data["disqualified_candidates_count"] > 0
    disq = data["disqualified_summary"]

    # Verify EMP-0052 was disqualified specifically due to certification mismatch
    emp0052_disq = [d for d in disq if d["employee_id"] == "EMP-0052"]
    assert len(emp0052_disq) == 1
    assert any("Certification mismatch: Role requires mandatory 'Forklift' certification, but candidate holds 'IPC-A-610'" in r
               for r in emp0052_disq[0]["disqualify_reasons"])

    # Verify that workers from Shift C were disqualified due to 0-hour turnaround fatigue hazard
    c_workers = [d for d in disq if d["shift"] == "C"]
    assert len(c_workers) > 0
    assert any("Turnaround conflict (fatigue hazard)" in r for r in c_workers[0]["disqualify_reasons"])


def test_replacement_recommendations_unrelated_cert_zero_points_when_non_mandatory(client):
    """Verify that when mandatory_certification=False, unrelated certifications receive 0 certification points."""
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0018&date=2026-08-01&mandatory_certification=false")
    assert res.status_code == 200
    data = res.json()

    assert data["mandatory_certification"] is False
    assert data["eligible_candidates_count"] == 2
    candidates = data["candidates"]

    # Rank 1 candidate EMP-0052 holds IPC-A-610, which is unrelated to Forklift
    rank1 = candidates[0]
    assert rank1["employee_id"] == "EMP-0052"
    assert rank1["certification"] == "IPC-A-610"
    # Phase 3 rule: Unrelated certification must receive 0.0 points (not 10.0 points as in Phase 2)
    assert rank1["score_breakdown"]["certification"] == 0.0
    assert any("Unrelated certification" in reason for reason in rank1["recommendation_reasons"])


def test_replacement_recommendations_exact_cert_match_emp0048(client):
    """Verify exact certification matching for EMP-0048 (Operator L2, LOTO, Shift A).

    Eligible candidates must hold exact 'LOTO' certification, skill grade >= L2,
    and have compliant 8-hour rest turnaround.
    """
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0048&date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    assert data["absent_employee"]["employee_id"] == "EMP-0048"
    assert data["absent_employee"]["certification"] == "LOTO"
    assert data["eligible_candidates_count"] == 2

    candidates = data["candidates"]
    candidate_ids = {c["employee_id"] for c in candidates}
    assert candidate_ids == {"EMP-0094", "EMP-0130"}

    for cand in candidates:
        assert cand["role"] == "Operator"
        assert cand["certification"] == "LOTO"  # Exact match
        assert cand["training_compliance"] == "CURRENT"
        assert cand["score_breakdown"]["certification"] == 20.0  # Full cert score
        assert cand["turnaround_hours"] == 8  # Compliant 8-hour rest interval
        assert cand["plant_id"] == "IN-TN-01"


def test_replacement_recommendations_exact_cert_match_emp0136(client):
    """Verify exact certification matching for EMP-0136 (Maintenance Tech L1, First Aid, Shift B).

    Candidate EMP-0170 holds First Aid, grade L1, and transitions from Shift C with 8h rest.
    """
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0136&date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    assert data["absent_employee"]["employee_id"] == "EMP-0136"
    assert data["absent_employee"]["certification"] == "First Aid"
    assert data["eligible_candidates_count"] == 1

    cand = data["candidates"][0]
    assert cand["employee_id"] == "EMP-0170"
    assert cand["role"] == "Maintenance Technician"
    assert cand["certification"] == "First Aid"
    assert cand["score_breakdown"]["certification"] == 20.0
    assert cand["turnaround_hours"] == 8


def test_shift_rest_turnaround_logic():
    """Directly validate shift turnaround mathematics and fatigue protection."""
    from app.services.workforce_planning_service import _check_rest_turnaround

    # Immediate consecutive shifts (0 hours rest -> Disqualified)
    ok_ca, rest_ca, _ = _check_rest_turnaround("C", "A")
    assert ok_ca is False
    assert rest_ca == 0

    ok_ab, rest_ab, _ = _check_rest_turnaround("A", "B")
    assert ok_ab is False
    assert rest_ab == 0

    ok_bc, rest_bc, _ = _check_rest_turnaround("B", "C")
    assert ok_bc is False
    assert rest_bc == 0

    # Same shift (already working -> Disqualified)
    ok_aa, rest_aa, _ = _check_rest_turnaround("A", "A")
    assert ok_aa is False

    # Compliant 8-hour rest intervals -> Compliant
    ok_ba, rest_ba, _ = _check_rest_turnaround("B", "A")
    assert ok_ba is True
    assert rest_ba == 8

    ok_cb, rest_cb, _ = _check_rest_turnaround("C", "B")
    assert ok_cb is True
    assert rest_cb == 8

    ok_ac, rest_ac, _ = _check_rest_turnaround("A", "C")
    assert ok_ac is True
    assert rest_ac == 8


def test_replacement_recommendations_skill_grade_hierarchy(client):
    """Verify skill grade hierarchy: absent worker EMP-0048 (Operator L2) allows L2-L4 candidates.

    - Candidate EMP-0094 (L2) qualifies with exact grade match (30.0 pts).
    - Candidate EMP-0130 (L4) qualifies with higher grade (25.0 pts).
    - Lower grade candidate EMP-0102 (L1) is disqualified (L1 < L2).
    """
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0048&date=2026-08-01")
    assert res.status_code == 200
    data = res.json()

    assert data["absent_employee"]["employee_id"] == "EMP-0048"
    assert data["absent_employee"]["skill_grade"] == "L2"
    assert data["eligible_candidates_count"] == 2

    # All eligible candidates must have grade in ['L2', 'L3', 'L4'] (never 'L1')
    grade_order = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}
    for cand in data["candidates"]:
        assert grade_order[cand["skill_grade"]] >= grade_order["L2"]
        assert cand["plant_id"] == data["absent_employee"]["plant_id"]
        assert cand["training_compliance"] == "CURRENT"

    # Verify score differences between exact grade match (L2 = 30 pts) and higher grade (L4 = 25 pts)
    cand_by_id = {c["employee_id"]: c for c in data["candidates"]}
    assert cand_by_id["EMP-0094"]["skill_grade"] == "L2"
    assert cand_by_id["EMP-0094"]["score_breakdown"]["skill_grade"] == 30.0
    assert cand_by_id["EMP-0130"]["skill_grade"] == "L4"
    assert cand_by_id["EMP-0130"]["score_breakdown"]["skill_grade"] == 25.0

    # Verify that lower-grade candidates (e.g. EMP-0102 with L1) are disqualified
    disq = data["disqualified_summary"]
    l1_disq = [d for d in disq if d["skill_grade"] == "L1"]
    assert len(l1_disq) > 0
    assert any("below absent employee grade L2" in r for r in l1_disq[0]["disqualify_reasons"])


def test_replacement_recommendations_employee_not_found(client):
    """Verify HTTP 404 when requested employee does not exist."""
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-9999&date=2026-08-01")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_replacement_recommendations_invalid_shift(client):
    """Verify HTTP 400 when invalid target shift is supplied."""
    res = client.get("/api/v1/planning/recommendations?employee_id=EMP-0018&date=2026-08-01&target_shift=Z")
    assert res.status_code == 400
    assert "Invalid target_shift" in res.json()["detail"]

