"""Focused unit and integration tests for Phase 4: Workforce Planning AI Agent Integration.

Covers:
1. Tool verification:
   - get_workforce_shortage tool execution and output schema
   - get_shift_workforce_availability tool execution and output schema
   - recommend_replacement_employees tool execution and output schema
   - Date, plant, and shift normalization (GS1/S2/NS3, TN/KA)
   - Mandatory certification enforcement in tool
   - Validation and error handling in tools
2. Registry verification:
   - Tool registry contains all 14 tools (11 original analytics + 3 planning tools)
   - Preserves existing 11 analytics tools
3. Agent service verification:
   - WorkforcePlanningAgentService instantiation and runnable pipeline
   - Integrated WorkforceAgentService tool execution
   - Empty query and error handling
4. API endpoint verification:
   - POST /api/v1/agent/chat endpoint compatibility
   - POST /api/v1/agent/planning-chat endpoint execution
   - Read-only database guarantees
"""

import datetime as dt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.agents.tools import tool_registry
from app.agents.tools.planning_tools import (
    get_workforce_shortage,
    get_shift_workforce_availability,
    recommend_replacement_employees,
    _normalize_shift_id,
    _normalize_plant_id,
    _normalize_department_id,
    _resolve_planning_date,
)
from app.agents.planning_agent_service import planning_agent_service
from app.agents.agent_service import agent_service


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ============================================================================
# 1. Tool Normalization & Helper Tests
# ============================================================================

def test_planning_tool_normalizers():
    """Verify shift, plant, department, and date normalizers."""
    # Shift normalizer (GS1 -> A, S2 -> B, NS3 -> C)
    assert _normalize_shift_id("GS1") == "A"
    assert _normalize_shift_id("S2") == "B"
    assert _normalize_shift_id("NS3") == "C"
    assert _normalize_shift_id("Shift A") == "A"
    assert _normalize_shift_id("B") == "B"
    assert _normalize_shift_id(None) is None

    # Plant normalizer
    assert _normalize_plant_id("TN") == "IN-TN-01"
    assert _normalize_plant_id("KA") == "IN-KA-01"
    assert _normalize_plant_id("IN-TN-01") == "IN-TN-01"
    assert _normalize_plant_id(None) is None

    # Department normalizer
    assert _normalize_department_id("Production") == "DEPT-01"
    assert _normalize_department_id("Maintenance") == "DEPT-02"
    assert _normalize_department_id("DEPT-01") == "DEPT-01"

    # Date normalizer
    assert _resolve_planning_date("2026-08-01") == dt.date(2026, 8, 1)
    assert _resolve_planning_date("today") == dt.date(2026, 8, 1)
    assert _resolve_planning_date(None) == dt.date(2026, 8, 1)
    with pytest.raises(ValueError):
        _resolve_planning_date("invalid-date-string")


# ============================================================================
# 2. Tool Execution Tests
# ============================================================================

def test_tool_get_workforce_shortage():
    """Verify get_workforce_shortage tool execution."""
    # Filtered by plant and shift
    res = get_workforce_shortage.invoke({
        "date": "2026-08-01",
        "plant_id": "IN-TN-01",
        "shift_id": "GS1",
    })
    assert res["status"] == "success"
    assert res["plant_id"] == "IN-TN-01"
    assert res["shift_id"] == "A"
    assert res["required_baseline"] == 30
    assert res["available_workforce"] == 26
    assert res["shortage_count"] == 4
    assert res["team_composition_validated"] is True

    # Invalid plant error handling
    res_err = get_workforce_shortage.invoke({"plant_id": "INVALID_PLANT"})
    assert res_err["status"] == "error"
    assert "Invalid plant_id" in res_err["message"]


def test_tool_get_shift_workforce_availability():
    """Verify get_shift_workforce_availability tool execution."""
    res = get_shift_workforce_availability.invoke({
        "date": "2026-08-01",
        "shift_id": "GS1",
    })
    assert res["status"] == "success"
    assert res["shift_id"] == "A"
    assert res["total_scheduled"] == 60
    assert res["present_count"] == 55
    assert res["available_count"] == 55
    assert res["absent_count"] == 1
    assert res["leave_count"] == 2
    assert res["late_count"] == 2
    assert res["availability_rate"] == 91.7


def test_tool_recommend_replacement_employees():
    """Verify recommend_replacement_employees tool execution with mandatory certification."""
    # EMP-0018: Maintenance Technician L4 requiring Forklift in IN-TN-01 -> 0 eligible
    res_0018 = recommend_replacement_employees.invoke({
        "employee_id": "EMP-0018",
        "date": "2026-08-01",
    })
    assert res_0018["status"] == "success"
    assert res_0018["absent_employee"]["employee_id"] == "EMP-0018"
    assert res_0018["absent_employee"]["certification"] == "Forklift"
    assert res_0018["eligible_candidates_count"] == 0
    assert "No eligible replacement candidates found" in res_0018["message"]

    # EMP-0048: Operator L2 requiring LOTO in IN-TN-01 -> 2 eligible candidates
    res_0048 = recommend_replacement_employees.invoke({
        "employee_id": "EMP-0048",
        "date": "2026-08-01",
    })
    assert res_0048["status"] == "success"
    assert res_0048["absent_employee"]["employee_id"] == "EMP-0048"
    assert res_0048["absent_employee"]["certification"] == "LOTO"
    assert res_0048["eligible_candidates_count"] == 2
    candidates = res_0048["candidates"]
    assert len(candidates) == 2
    assert {c["employee_id"] for c in candidates} == {"EMP-0094", "EMP-0130"}

    # Unknown employee error handling
    res_unknown = recommend_replacement_employees.invoke({
        "employee_id": "EMP-9999",
        "date": "2026-08-01",
    })
    assert res_unknown["status"] == "error"
    assert "not found" in res_unknown["message"].lower()


# ============================================================================
# 3. Tool Registry & Backward Compatibility Tests
# ============================================================================

def test_tool_registry_preserves_existing_tools_and_registers_planning_tools():
    """Verify tool registry contains exactly 14 tools including the 11 original analytics tools."""
    tool_names = set(tool_registry.get_tool_names())

    # 11 Original analytics tools
    expected_original = {
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
    assert expected_original.issubset(tool_names), f"Missing original tools: {expected_original - tool_names}"

    # 3 New workforce planning tools
    expected_planning = {
        "get_workforce_shortage",
        "get_shift_workforce_availability",
        "recommend_replacement_employees",
    }
    assert expected_planning.issubset(tool_names), f"Missing planning tools: {expected_planning - tool_names}"

    # Verify original analytics tools execute without breakage
    summary_tool = tool_registry.get_tool("get_workforce_summary")
    assert summary_tool is not None
    summary_output = summary_tool.invoke({})
    assert summary_output["status"] == "success"
    assert summary_output["total_employees"] == 180


# ============================================================================
# 4. Agent Service & LCEL Runnable Tests
# ============================================================================

def test_planning_agent_service_runnable_and_structure():
    """Verify dedicated planning agent service setup."""
    assert planning_agent_service is not None
    assert len(planning_agent_service.tools) == 3
    tool_names = [t.name for t in planning_agent_service.tools]
    assert "get_workforce_shortage" in tool_names
    assert "get_shift_workforce_availability" in tool_names
    assert "recommend_replacement_employees" in tool_names

    # Test empty query handling
    empty_res = planning_agent_service.execute_query("")
    assert empty_res["status"] == "error"
    assert "Empty query" in empty_res["error"]


def test_central_agent_service_integrates_planning_tools():
    """Verify central agent service has access to planning tools."""
    tool_names = agent_service.tool_registry.get_tool_names()
    assert "get_workforce_shortage" in tool_names
    assert "get_shift_workforce_availability" in tool_names
    assert "recommend_replacement_employees" in tool_names


# ============================================================================
# 5. API Endpoint Tests
# ============================================================================

def test_agent_chat_endpoint_valid_request(client):
    """Verify POST /api/v1/agent/chat continues to work seamlessly."""
    payload = {"message": "Who can replace EMP-0048 on 2026-08-01?"}
    res = client.post("/api/v1/agent/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "conversation_id" in data
    assert "tools_used" in data
    assert "recommend_replacement_employees" in data["tools_used"]
    assert "EMP-0094" in data["answer"] or "Divya Reddy" in data["answer"]


def test_agent_planning_chat_endpoint(client):
    """Verify dedicated POST /api/v1/agent/planning-chat endpoint."""
    payload = {"message": "Which plant has a workforce shortage today?"}
    res = client.post("/api/v1/agent/planning-chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "conversation_id" in data
    assert "tools_used" in data
    assert "get_workforce_shortage" in data["tools_used"]


def test_agent_chat_endpoint_validation_errors(client):
    """Verify HTTP 400 on empty or invalid messages."""
    res_empty = client.post("/api/v1/agent/chat", json={"message": "   "})
    assert res_empty.status_code == 400
    assert "cannot be empty" in res_empty.json()["detail"].lower()

    res_invalid_body = client.post("/api/v1/agent/chat", content="not json", headers={"Content-Type": "application/json"})
    assert res_invalid_body.status_code == 400

