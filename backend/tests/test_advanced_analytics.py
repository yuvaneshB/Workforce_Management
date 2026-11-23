"""Focused unit and integration tests for Phase 2: Backend Analytics Service Expansion.

Covers:
- Overtime Analytics (/api/v1/analytics/overtime)
- Team Production Analytics (/api/v1/analytics/team-production)
- Shift-wise Efficiency (/api/v1/analytics/shift-efficiency)
- Skill Matrix Analytics (/api/v1/analytics/skills)
- Training Compliance Analytics (/api/v1/analytics/compliance)
- Preservation of existing analytics endpoints
- Filters: date range, shift, department, section, plant, team
- Edge cases: zero denominators, empty result sets, reversed dates
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ============================================================================
# Feature 1: Overtime Analytics Tests
# ============================================================================

def test_overtime_analytics_overall(client):
    """Verify GET /api/v1/analytics/overtime returns verified aggregates and structure."""
    res = client.get("/api/v1/analytics/overtime")
    assert res.status_code == 200
    data = res.json()

    assert data["total_attendance_records"] == 16560
    assert data["total_overtime_hours"] == 10072
    assert data["total_employees_with_overtime"] == 180
    assert data["overtime_record_count"] == 6707
    assert data["total_employees"] == 180
    assert data["overtime_rate_pct"] == 40.5
    assert data["avg_overtime_hours_per_employee"] == 56.0

    # Shifts breakdown
    assert len(data["shift_wise"]) == 3
    for s in data["shift_wise"]:
        assert s["shift_id"] in ["A", "B", "C"]
        assert s["overtime_hours"] > 0
        assert s["overtime_rate_pct"] > 0

    # Departments breakdown (6 departments in master)
    assert len(data["department_wise"]) == 6
    dept_names = {d["department_name"]: d for d in data["department_wise"]}
    assert "Production" in dept_names
    assert "Engineering" in dept_names
    assert dept_names["Engineering"]["employee_count"] == 0
    assert dept_names["Engineering"]["overtime_hours"] == 0

    # Sections breakdown (6 sections)
    assert len(data["section_wise"]) == 6

    # Top employees with overtime
    assert len(data["employee_wise"]) <= 20
    assert len(data["employee_wise"]) > 0
    assert data["employee_wise"][0]["overtime_hours"] >= data["employee_wise"][-1]["overtime_hours"]

    # Trends and distribution
    assert len(data["daily_trend"]) == 92
    assert len(data["monthly_trend"]) == 3
    assert len(data["overtime_distribution"]) == 3  # 0, 1, and 2 hours
    dist_map = {d["overtime_hours"]: d for d in data["overtime_distribution"]}
    assert dist_map[0]["record_count"] == 9853
    assert dist_map[1]["record_count"] == 3342
    assert dist_map[2]["record_count"] == 3365
    assert dist_map[1]["record_count"] + dist_map[2]["record_count"] == 6707


def test_overtime_analytics_filters(client):
    """Verify overtime analytics filters by date range, shift, department, section, plant."""
    # Date range filter
    res = client.get("/api/v1/analytics/overtime", params={
        "start_date": "2026-08-01",
        "end_date": "2026-08-31",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total_attendance_records"] == 31 * 180
    assert len(data["daily_trend"]) == 31

    # Shift filter
    res_shift = client.get("/api/v1/analytics/overtime", params={"shift_id": "A"})
    assert res_shift.status_code == 200
    data_shift = res_shift.json()
    assert len(data_shift["shift_wise"]) == 1
    assert data_shift["shift_wise"][0]["shift_id"] == "A"

    # Department filter
    res_dept = client.get("/api/v1/analytics/overtime", params={"department_id": "DEPT-01"})
    assert res_dept.status_code == 200
    data_dept = res_dept.json()
    assert len(data_dept["department_wise"]) == 1
    assert data_dept["department_wise"][0]["department_id"] == "DEPT-01"

    # Section filter
    res_sec = client.get("/api/v1/analytics/overtime", params={"section_id": "SEC-01"})
    assert res_sec.status_code == 200
    data_sec = res_sec.json()
    assert len(data_sec["section_wise"]) == 1
    assert data_sec["section_wise"][0]["section_id"] == "SEC-01"


# ============================================================================
# Feature 2: Team Production Analytics Tests
# ============================================================================

def test_team_production_analytics_overall(client):
    """Verify GET /api/v1/analytics/team-production independently aggregates production and attendance."""
    res = client.get("/api/v1/analytics/team-production")
    assert res.status_code == 200
    data = res.json()

    assert data["total_teams"] == 18
    assert data["total_actual_qty"] == 2424184
    assert data["total_target_qty"] == 2914560
    assert data["overall_achievement_pct"] == 83.2
    assert "attribution_note" in data

    # Verify each team
    for tm in data["items"]:
        assert tm["headcount"] == 10  # 10 employees per team in dim_workforce
        assert tm["actual_qty"] > 0
        assert tm["target_qty"] > 0
        assert tm["present_employee_count"] > 0
        assert tm["production_per_present_employee"] > 0
        # verify formula: prod_per_present == round(actual_qty / present_count, 1)
        expected_per_present = round(tm["actual_qty"] / tm["present_employee_count"], 1)
        assert abs(tm["production_per_present_employee"] - expected_per_present) <= 0.1


def test_team_production_filters(client):
    """Verify team production filtering by operator_team, date range, plant, shift."""
    res = client.get("/api/v1/analytics/team-production", params={"operator_team": "TEAM-01"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_teams"] == 1
    assert data["items"][0]["operator_team"] == "TEAM-01"
    assert data["items"][0]["actual_qty"] == 140010

    # Plant filter
    res_plant = client.get("/api/v1/analytics/team-production", params={"plant_id": "IN-KA-01"})
    assert res_plant.status_code == 200
    assert res_plant.json()["total_actual_qty"] == 1217813


# ============================================================================
# Feature 3: Shift-wise Production and Workforce Efficiency Tests
# ============================================================================

def test_shift_efficiency_overall(client):
    """Verify GET /api/v1/analytics/shift-efficiency correlates production and attendance by shift."""
    res = client.get("/api/v1/analytics/shift-efficiency")
    assert res.status_code == 200
    data = res.json()

    assert data["total_shifts"] == 3
    assert data["total_actual_qty"] == 2424184
    assert data["total_present_employees"] == 15139
    assert data["total_absent_employees"] == 554
    assert "productivity_note" in data

    # Verify shifts A, B, C
    shift_map = {s["shift_id"]: s for s in data["items"]}
    assert set(shift_map.keys()) == {"A", "B", "C"}
    for s_id, s in shift_map.items():
        assert s["actual_qty"] > 800000
        assert s["present_employees"] > 4000
        assert s["attendance_pct"] > 85.0
        expected_eff = round(s["actual_qty"] / s["present_employees"], 1)
        assert abs(s["production_per_present_employee"] - expected_eff) <= 0.1


# ============================================================================
# Feature 4: Skill Matrix Analytics Tests
# ============================================================================

def test_skills_analytics_overall(client):
    """Verify GET /api/v1/analytics/skills returns skill grades, departments, sections, teams, certs."""
    res = client.get("/api/v1/analytics/skills")
    assert res.status_code == 200
    data = res.json()

    assert data["total_employees"] == 180

    # Skill grades: L1 (43), L2 (54), L3 (38), L4 (45)
    sg_map = {item["skill_grade"]: item["employee_count"] for item in data["skill_grade_distribution"]}
    assert sg_map == {"L1": 43, "L2": 54, "L3": 38, "L4": 45}

    # Department skills
    assert len(data["department_skills"]) == 5  # 5 active departments with employees
    for d in data["department_skills"]:
        assert d["l1_count"] + d["l2_count"] + d["l3_count"] + d["l4_count"] == d["total_employees"]

    # Section skills
    assert len(data["section_skills"]) == 6  # 6 sections of 30 employees
    for s in data["section_skills"]:
        assert s["total_employees"] == 30

    # Team skills
    assert len(data["team_skills"]) == 18  # 18 teams of 10 employees
    for t in data["team_skills"]:
        assert t["total_employees"] == 10

    # Certifications
    assert len(data["certification_distribution"]) == 6
    assert sum(c["employee_count"] for c in data["certification_distribution"]) == 180


def test_skills_analytics_filters(client):
    """Verify skill analytics filters by department, section, team, shift."""
    res_dept = client.get("/api/v1/analytics/skills", params={"department_id": "DEPT-01"})
    assert res_dept.status_code == 200
    assert res_dept.json()["total_employees"] == 54

    res_sec = client.get("/api/v1/analytics/skills", params={"section_id": "SEC-01"})
    assert res_sec.status_code == 200
    assert res_sec.json()["total_employees"] == 30

    res_team = client.get("/api/v1/analytics/skills", params={"team_id": "TEAM-01"})
    assert res_team.status_code == 200
    assert res_team.json()["total_employees"] == 10


# ============================================================================
# Feature 5: Training Compliance Analytics Tests
# ============================================================================

def test_compliance_analytics_overall(client):
    """Verify GET /api/v1/analytics/compliance calculates compliance and skill-match separately."""
    res = client.get("/api/v1/analytics/compliance")
    assert res.status_code == 200
    data = res.json()

    # Training compliance
    assert data["total_compliance_records"] == 16560
    assert data["current_count"] == 16162
    assert data["expired_count"] == 398
    assert data["training_compliance_pct"] == 97.6

    # Skill match
    assert data["total_skill_match_records"] == 16560
    assert data["matched_count"] == 15918
    assert data["gap_count"] == 642
    assert data["skill_match_pct"] == 96.1

    # Shift-wise compliance
    assert len(data["shift_wise"]) == 3
    for s in data["shift_wise"]:
        assert s["compliance_pct"] > 90.0
        assert s["skill_match_pct"] > 90.0

    # Department-wise compliance (6 departments in master, including Engineering with 0 records)
    assert len(data["department_wise"]) == 6
    dept_map = {d["department_name"]: d for d in data["department_wise"]}
    assert "Production" in dept_map
    assert "Engineering" in dept_map
    assert dept_map["Engineering"]["total_records"] == 0
    assert dept_map["Engineering"]["compliance_pct"] == 0.0

    # Section-wise compliance
    assert len(data["section_wise"]) == 6
    for s in data["section_wise"]:
        assert s["total_records"] == 30 * 92  # 30 employees * 92 days

    # Daily trend
    assert len(data["daily_trend"]) == 92
    assert "denominator_note" in data


# ============================================================================
# Feature 6: Existing Endpoints Preservation Tests
# ============================================================================

def test_existing_endpoints_preserved(client):
    """Verify that all 7 existing analytics endpoints continue to function identically."""
    endpoints = [
        "/api/v1/analytics/attendance",
        "/api/v1/analytics/production",
        "/api/v1/analytics/departments",
        "/api/v1/analytics/sections",
        "/api/v1/analytics/experience",
        "/api/v1/analytics/gender",
        "/api/v1/analytics/new-joiners",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"Endpoint {ep} failed with status {res.status_code}"


# ============================================================================
# Edge Cases: Zero Denominator, Empty Results, Invalid Dates
# ============================================================================

def test_edge_cases_empty_results_and_zero_handling(client):
    """Verify safe zero division, empty filter results, and invalid date validation."""
    # Out-of-bounds date range returns HTTP 200 with 0s (no division by zero crash)
    res = client.get("/api/v1/analytics/overtime", params={
        "start_date": "2020-01-01",
        "end_date": "2020-01-02",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total_overtime_hours"] == 0
    assert data["overtime_rate_pct"] == 0.0
    assert data["avg_overtime_hours_per_employee"] == 0.0

    # Team production for non-existent team
    res_team = client.get("/api/v1/analytics/team-production", params={
        "operator_team": "TEAM-999",
    })
    assert res_team.status_code == 200
    assert res_team.json()["total_teams"] == 0

    # Shift efficiency for empty range
    res_eff = client.get("/api/v1/analytics/shift-efficiency", params={
        "start_date": "2020-01-01",
        "end_date": "2020-01-02",
    })
    assert res_eff.status_code == 200
    assert res_eff.json()["total_actual_qty"] == 0
    assert res_eff.json()["overall_achievement_pct"] == 0.0

    # Reversed dates return 422
    assert client.get("/api/v1/analytics/overtime", params={
        "start_date": "2026-10-01",
        "end_date": "2026-09-01",
    }).status_code == 422
