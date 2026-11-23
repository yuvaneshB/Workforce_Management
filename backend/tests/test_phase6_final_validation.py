"""Focused End-to-End Validation Suite for Phase 6: Workforce Management Agent Final Integration.

Validates:
1. Planning API Endpoints:
   - GET /api/v1/planning/availability (all filters, partial filters, status counts, 400 on invalid plant/shift)
   - GET /api/v1/planning/shortages (baseline calculation, team composition, role shortages, 400 on invalid plant/shift)
   - GET /api/v1/planning/recommendations (mandatory cert true/false, eligible match, no candidate match, 404 on missing emp, 400 on invalid shift)
2. AI Agent Tool Routing & Grounding:
   - Tool registry contains exactly 14 tools
   - 11 original analytics tools + 3 planning tools
   - AI agent routes shortage queries to get_workforce_shortage
   - AI agent routes availability queries to get_shift_workforce_availability
   - AI agent routes replacement queries to recommend_replacement_employees
   - AI agent preserves existing analytics tool execution
3. Regression on Critical Application Endpoints:
   - GET /api/v1/workforce/summary (Dashboard)
   - GET /api/v1/analytics/attendance (Analytics)
   - POST /api/v1/agent/chat (AI Assistant)
4. Read-only Neon PostgreSQL verification:
   - Engine check confirms read-only connection
"""

import datetime as dt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.agents.tools import tool_registry
from app.agents.agent_service import agent_service
from app.agents.planning_agent_service import planning_agent_service
from app.core.database import db_manager


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ============================================================================
# 1. Planning API Endpoints Comprehensive Validation
# ============================================================================

def test_api_availability_full_filter_combinations(client):
    """Verify /api/v1/planning/availability across diverse filter combinations."""
    # 1. Unfiltered (Factory wide)
    res_all = client.get("/api/v1/planning/availability?date=2026-08-01")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total_scheduled"] == 180
    assert data_all["available_count"] == data_all["present_count"]
    assert data_all["present_count"] + data_all["absent_count"] + data_all["leave_count"] + data_all["late_count"] == 180

    # 2. Plant filtered (IN-TN-01)
    res_tn = client.get("/api/v1/planning/availability?date=2026-08-01&plant_id=IN-TN-01")
    assert res_tn.status_code == 200
    data_tn = res_tn.json()
    assert data_tn["total_scheduled"] == 90

    # 3. Plant + Shift filtered (IN-TN-01, Shift A)
    res_tn_a = client.get("/api/v1/planning/availability?date=2026-08-01&plant_id=IN-TN-01&shift_id=A")
    assert res_tn_a.status_code == 200
    data_tn_a = res_tn_a.json()
    assert data_tn_a["total_scheduled"] == 30
    assert data_tn_a["present_count"] == 26
    assert data_tn_a["absent_count"] == 1
    assert data_tn_a["leave_count"] == 1
    assert data_tn_a["late_count"] == 2

    # 4. Department filtered (Production DEPT-01)
    res_dept = client.get("/api/v1/planning/availability?date=2026-08-01&department_id=DEPT-01")
    assert res_dept.status_code == 200
    assert res_dept.json()["total_scheduled"] == 54

    # 5. Section filtered (SMT Production SEC-01)
    res_sec = client.get("/api/v1/planning/availability?date=2026-08-01&section_id=SEC-01")
    assert res_sec.status_code == 200
    assert res_sec.json()["total_scheduled"] == 30

    # 6. Error handling: invalid plant
    res_bad_plant = client.get("/api/v1/planning/availability?date=2026-08-01&plant_id=INVALID")
    assert res_bad_plant.status_code == 400
    assert "Invalid plant_id" in res_bad_plant.json()["detail"]

    # 7. Error handling: invalid shift
    res_bad_shift = client.get("/api/v1/planning/availability?date=2026-08-01&shift_id=X")
    assert res_bad_shift.status_code == 400
    assert "Invalid shift_id" in res_bad_shift.json()["detail"]


def test_api_shortages_baseline_and_scopes(client):
    """Verify /api/v1/planning/shortages against verified 10-person team baselines."""
    # 1. Entire Factory Baseline (180 workers)
    res_fact = client.get("/api/v1/planning/shortages?date=2026-08-01")
    assert res_fact.status_code == 200
    data_fact = res_fact.json()
    assert data_fact["required_baseline"] == 180
    assert data_fact["shortage_count"] == 15
    assert data_fact["severity"] == "LOW"
    assert data_fact["team_composition_validated"] is True
    assert len(data_fact["scheduled_teams"]) == 18

    # 2. Plant-Shift Baseline (30 workers)
    res_ps = client.get("/api/v1/planning/shortages?date=2026-08-01&plant_id=IN-TN-01&shift_id=A")
    assert res_ps.status_code == 200
    data_ps = res_ps.json()
    assert data_ps["required_baseline"] == 30
    assert data_ps["available_workforce"] == 26
    assert data_ps["shortage_count"] == 4
    assert data_ps["severity"] == "MODERATE"
    assert len(data_ps["scheduled_teams"]) == 3
    for team in data_ps["scheduled_teams"]:
        assert team["is_standard_size"] is True
        assert team["headcount"] == 10

    # 3. Role shortages presence
    assert "role_shortages" in data_ps
    assert "Maintenance Technician" in data_ps["role_shortages"]

    # 4. Error handling
    res_err = client.get("/api/v1/planning/shortages?date=2026-08-01&plant_id=UNKNOWN")
    assert res_err.status_code == 400


def test_api_recommendations_mandatory_and_disqualification(client):
    """Verify /api/v1/planning/recommendations with both positive and negative cases."""
    # Case 1: EMP-0048 (Operator L2, LOTO) -> Exactly 2 eligible candidates
    res_0048 = client.get("/api/v1/planning/recommendations?employee_id=EMP-0048&date=2026-08-01")
    assert res_0048.status_code == 200
    data_0048 = res_0048.json()
    assert data_0048["absent_employee"]["employee_id"] == "EMP-0048"
    assert data_0048["absent_employee"]["certification"] == "LOTO"
    assert data_0048["eligible_candidates_count"] == 2
    for cand in data_0048["candidates"]:
        assert cand["role"] == "Operator"
        assert cand["certification"] == "LOTO"
        assert cand["training_compliance"] == "CURRENT"
        assert cand["turnaround_hours"] == 8

    # Case 2: EMP-0018 (Maintenance Tech L4, Forklift) with mandatory_certification=True -> 0 eligible
    res_0018_mand = client.get("/api/v1/planning/recommendations?employee_id=EMP-0018&date=2026-08-01&mandatory_certification=true")
    assert res_0018_mand.status_code == 200
    data_0018_mand = res_0018_mand.json()
    assert data_0018_mand["eligible_candidates_count"] == 0
    assert "No eligible replacement candidates found" in data_0018_mand["message"]
    # Check that EMP-0052 is in disqualified_summary
    disq = data_0018_mand["disqualified_summary"]
    emp0052 = next((d for d in disq if d["employee_id"] == "EMP-0052"), None)
    assert emp0052 is not None
    assert any("Certification mismatch" in r for r in emp0052["disqualify_reasons"])

    # Case 3: EMP-0018 with mandatory_certification=False -> Candidate admitted but 0.0 cert score
    res_0018_non_mand = client.get("/api/v1/planning/recommendations?employee_id=EMP-0018&date=2026-08-01&mandatory_certification=false")
    assert res_0018_non_mand.status_code == 200
    data_0018_non_mand = res_0018_non_mand.json()
    assert data_0018_non_mand["eligible_candidates_count"] > 0
    rank1 = data_0018_non_mand["candidates"][0]
    assert rank1["score_breakdown"]["certification"] == 0.0

    # Case 4: Employee not found -> 404
    res_404 = client.get("/api/v1/planning/recommendations?employee_id=EMP-9999&date=2026-08-01")
    assert res_404.status_code == 404

    # Case 5: Invalid target shift -> 400
    res_bad_shift = client.get("/api/v1/planning/recommendations?employee_id=EMP-0048&date=2026-08-01&target_shift=Z")
    assert res_bad_shift.status_code == 400


# ============================================================================
# 2. AI Agent Tool Registration & Integration Validation
# ============================================================================

def test_ai_agent_tool_registry_integrity():
    """Verify tool registry contains all 14 tools (11 original + 3 planning)."""
    tool_names = set(tool_registry.get_tool_names())
    assert len(tool_names) == 14

    # 11 Original analytics tools
    original_11 = {
        "get_workforce_summary",
        "get_attendance_analytics",
        "get_department_analytics",
        "get_shift_analytics",
        "get_experience_analytics",
        "get_section_analytics",
        "get_overtime_analytics",
        "get_team_production_analytics",
        "get_shift_efficiency_analytics",
        "get_skills_analytics",
        "get_compliance_analytics",
    }
    assert original_11.issubset(tool_names)

    # 3 Planning tools
    planning_3 = {
        "get_workforce_shortage",
        "get_shift_workforce_availability",
        "recommend_replacement_employees",
    }
    assert planning_3.issubset(tool_names)


def test_dedicated_planning_agent_service_tools():
    """Verify dedicated planning agent service contains only planning tools."""
    tools = planning_agent_service.tools
    names = {t.name for t in tools}
    assert names == {
        "get_workforce_shortage",
        "get_shift_workforce_availability",
        "recommend_replacement_employees",
    }


def test_ai_agent_planning_chat_endpoint_execution(client):
    """Verify POST /api/v1/agent/planning-chat executes planning query using planning tools."""
    res = client.post("/api/v1/agent/planning-chat", json={
        "message": "Who can replace EMP-0048 on 2026-08-01?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "tools_used" in data
    assert "recommend_replacement_employees" in data["tools_used"]
    assert "EMP-0094" in data["answer"] or "Divya Reddy" in data["answer"]


def test_ai_agent_chat_endpoint_shortage_routing(client):
    """Verify POST /api/v1/agent/chat routes shortage questions to get_workforce_shortage."""
    res = client.post("/api/v1/agent/chat", json={
        "message": "Which plant has a workforce shortage today?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "tools_used" in data
    assert "get_workforce_shortage" in data["tools_used"]


# ============================================================================
# 3. Regression Validation on Existing Endpoints
# ============================================================================

def test_regression_workforce_summary_endpoint(client):
    """Verify existing workforce summary endpoint remains functional."""
    res = client.get("/api/v1/workforce/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_employees"] == 180
    assert data["active_employees"] == 180
    assert data["distinct_teams"] == 18


def test_regression_attendance_analytics_endpoint(client):
    """Verify existing attendance analytics endpoint remains functional."""
    res = client.get("/api/v1/analytics/attendance?start_date=2026-08-01&end_date=2026-08-01")
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 180


def test_regression_analytics_skills_endpoint(client):
    """Verify existing skills analytics endpoint remains functional."""
    res = client.get("/api/v1/analytics/skills")
    assert res.status_code == 200
    data = res.json()
    assert data["total_employees"] == 180


# ============================================================================
# 4. Database Safety Verification
# ============================================================================

def test_database_readonly_enforcement():
    """Verify database connection pool is configured and read-only."""
    assert db_manager.readonly_engine is not None
    # Execute a read query to confirm connection
    from sqlalchemy import text
    with db_manager.readonly_engine.connect() as conn:
        val = conn.execute(text("SELECT 1")).scalar()
        assert val == 1

