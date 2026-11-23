"""Focused unit and integration tests for AI-powered Workforce Analytics Tools (Phase 4).

Validates:
1. Tool registry containing all 11 tools (6 preserved + 5 new analytics tools).
2. Execution, argument validation, and response structures of:
   - get_overtime_analytics
   - get_team_production_analytics
   - get_shift_efficiency_analytics
   - get_skills_analytics
   - get_compliance_analytics
3. Date window validation and error handling for all date-based tools.
4. Database error handling and graceful degradation.
5. End-to-end agent execution with FakeToolCallingChatModel via POST /api/v1/agent/chat.
6. Guardrails preventing unrestricted SQL execution.
7. Verification against the live read-only Neon database.
"""

import datetime as dt
import json
import os
from contextlib import contextmanager
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.agents.llm.provider import clear_provider_registry, register_llm_provider
from app.agents.memory.conversation_memory import conversation_memory
from app.agents.tools.workforce_tools import (
    get_attendance_analytics,
    get_compliance_analytics,
    get_department_analytics,
    get_experience_analytics,
    get_overtime_analytics,
    get_section_analytics,
    get_shift_analytics,
    get_shift_efficiency_analytics,
    get_skills_analytics,
    get_team_production_analytics,
    get_workforce_summary,
    tool_registry,
)
from app.main import app


@contextmanager
def _mock_db_session():
    """Mock context manager simulating a database session."""
    yield MagicMock()


class FakeToolCallingChatModel(BaseChatModel):
    """Deterministic fake chat model simulating tool calling and response synthesis."""

    target_tool: str | None = None
    target_args: dict[str, Any] = {}
    final_answer: str = "Grounding answer synthesized from actual tool output."

    @property
    def _llm_type(self) -> str:
        return "fake-analytics-tool-caller"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages: list[BaseMessage], stop=None, **kwargs) -> ChatResult:
        has_tool_message = any(isinstance(m, ToolMessage) for m in messages)
        if not has_tool_message and self.target_tool:
            msg = AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": self.target_tool,
                        "args": self.target_args,
                        "id": f"call_{self.target_tool}_001",
                    }
                ],
            )
        else:
            msg = AIMessage(content=self.final_answer)

        return ChatResult(generations=[ChatGeneration(message=msg)])


@pytest.fixture(autouse=True)
def clean_state():
    """Ensure clean provider registry and memory before and after each test."""
    clear_provider_registry()
    conversation_memory.clear_all()
    yield
    clear_provider_registry()
    conversation_memory.clear_all()


# ============================================================================
# 1. TOOL REGISTRY VERIFICATION (All 11 Tools)
# ============================================================================


def test_complete_tool_registry_11_tools():
    """Verify that all 11 workforce tools are registered in WorkforceToolRegistry."""
    tools = tool_registry.get_registered_tools()
    tool_names = tool_registry.get_tool_names()

    assert len(tools) == 11, f"Expected exactly 11 registered tools, got {len(tools)}: {tool_names}"

    # 6 Preserved Core Tools
    assert "get_workforce_summary" in tool_names
    assert "get_attendance_analytics" in tool_names
    assert "get_department_analytics" in tool_names
    assert "get_shift_analytics" in tool_names
    assert "get_experience_analytics" in tool_names
    assert "get_section_analytics" in tool_names

    # 5 Advanced Analytics Tools (Phase 4)
    assert "get_overtime_analytics" in tool_names
    assert "get_team_production_analytics" in tool_names
    assert "get_shift_efficiency_analytics" in tool_names
    assert "get_skills_analytics" in tool_names
    assert "get_compliance_analytics" in tool_names

    # Verify tool argument schemas
    ot_tool = tool_registry.get_tool("get_overtime_analytics")
    assert "start_date" in ot_tool.args
    assert "shift_id" in ot_tool.args
    assert "department_id" in ot_tool.args

    tp_tool = tool_registry.get_tool("get_team_production_analytics")
    assert "operator_team" in tp_tool.args
    assert "plant_id" in tp_tool.args

    se_tool = tool_registry.get_tool("get_shift_efficiency_analytics")
    assert "start_date" in se_tool.args
    assert "shift_id" in se_tool.args

    sk_tool = tool_registry.get_tool("get_skills_analytics")
    assert "department_id" in sk_tool.args
    assert "team_id" in sk_tool.args

    cp_tool = tool_registry.get_tool("get_compliance_analytics")
    assert "start_date" in cp_tool.args
    assert "shift_id" in cp_tool.args


# ============================================================================
# 2. OVERTIME ANALYTICS TOOL TESTS
# ============================================================================


def test_get_overtime_analytics_success():
    """Verify get_overtime_analytics executes and formats overtime metrics correctly."""
    mock_data = {
        "total_overtime_hours": 10072.0,
        "total_employees_with_overtime": 180,
        "overtime_record_count": 6707,
        "overtime_rate_pct": 40.5,
        "avg_overtime_hours_per_employee": 56.0,
        "shift_wise": [{"shift_id": "A", "overtime_hours": 3348}],
        "department_wise": [{"department_id": "DEPT-01", "overtime_hours": 3000}],
        "section_wise": [],
        "employee_wise": [{"employee_id": "EMP-001", "total_overtime_hours": 92}],
        "monthly_trend": [{"month": "2026-08", "overtime_hours": 3400}],
        "daily_trend": [{"date": "2026-08-01", "overtime_hours": 110}],
    }

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_overtime_analytics", return_value=mock_data) as mock_svc:
            res = get_overtime_analytics.invoke({
                "start_date": "2026-08-01",
                "end_date": "2026-10-31",
                "shift_id": "A",
            })

            assert mock_svc.called
            assert res["status"] == "success"
            assert res["total_overtime_hours"] == 10072.0
            assert res["total_employees_with_overtime"] == 180
            assert res["overtime_rate_pct"] == 40.5
            assert len(res["shift_wise"]) == 1
            assert res["filters_applied"]["shift_id"] == "A"
            assert res["filters_applied"]["start_date"] == "2026-08-01"


def test_get_overtime_analytics_validation_errors():
    """Verify get_overtime_analytics catches invalid dates and inverted date windows."""
    # Invalid date format
    res_inv = get_overtime_analytics.invoke({"start_date": "2026/08/01"})
    assert res_inv["status"] == "error"
    assert res_inv["error_type"] == "ValidationError"

    # Inverted date window
    res_window = get_overtime_analytics.invoke({
        "start_date": "2026-10-31",
        "end_date": "2026-08-01",
    })
    assert res_window["status"] == "error"
    assert res_window["error_type"] == "ValidationError"


def test_get_overtime_analytics_database_error():
    """Verify get_overtime_analytics handles database exceptions safely."""
    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_overtime_analytics", side_effect=Exception("Neon DB timeout")):
            res = get_overtime_analytics.invoke({})
            assert res["status"] == "error"
            assert res["error_type"] == "DatabaseError"
            assert "Neon DB timeout" in res["message"]


# ============================================================================
# 3. TEAM PRODUCTION ANALYTICS TOOL TESTS
# ============================================================================


def test_get_team_production_analytics_success():
    """Verify get_team_production_analytics retrieves team production metrics and enforces team-level attribution."""
    mock_data = {
        "total_teams": 18,
        "total_target_qty": 2914560,
        "total_actual_qty": 2424184,
        "total_good_qty": 2378960,
        "total_reject_qty": 45224,
        "total_rework_qty": 24852,
        "total_downtime_min": 60290,
        "overall_achievement_pct": 83.2,
        "total_present_employees": 15139,
        "total_absent_employees": 554,
        "overall_production_per_present_employee": 160.1,
        "items": [
            {
                "operator_team": "TEAM-01",
                "headcount": 10,
                "target_qty": 169350,
                "actual_qty": 140010,
                "good_qty": 137371,
                "reject_qty": 2639,
                "rework_qty": 1432,
                "downtime_min": 3725,
                "production_achievement_pct": 82.7,
                "present_employee_count": 839,
                "absent_employee_count": 32,
                "production_per_present_employee": 166.9,
            }
        ],
        "attribution_note": "Production is tracked and attributed at the operator team level, not per individual employee.",
    }

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_team_production_analytics", return_value=mock_data) as mock_svc:
            res = get_team_production_analytics.invoke({"operator_team": "TEAM-01"})
            assert mock_svc.called
            assert res["status"] == "success"
            assert res["total_teams"] == 18
            assert res["overall_achievement_pct"] == 83.2
            assert res["items"][0]["operator_team"] == "TEAM-01"
            assert "team" in res["attribution_note"].lower()


def test_get_team_production_analytics_validation_and_errors():
    """Verify validation and database error handling for team production tool."""
    res_inv = get_team_production_analytics.invoke({"start_date": "not-a-date"})
    assert res_inv["status"] == "error"
    assert res_inv["error_type"] == "ValidationError"

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_team_production_analytics", side_effect=Exception("DB Query Failed")):
            res = get_team_production_analytics.invoke({})
            assert res["status"] == "error"
            assert res["error_type"] == "DatabaseError"


# ============================================================================
# 4. SHIFT EFFICIENCY ANALYTICS TOOL TESTS
# ============================================================================


def test_get_shift_efficiency_analytics_success():
    """Verify get_shift_efficiency_analytics retrieves correlated shift production and attendance metrics."""
    mock_data = {
        "total_shifts": 3,
        "total_target_qty": 2914560,
        "total_actual_qty": 2424184,
        "total_good_qty": 2378960,
        "total_reject_qty": 45224,
        "total_rework_qty": 24852,
        "total_downtime_min": 60290,
        "overall_achievement_pct": 83.2,
        "total_present_employees": 15139,
        "total_absent_employees": 554,
        "overall_production_per_present_employee": 160.1,
        "items": [
            {
                "shift_id": "A",
                "target_qty": 971520,
                "actual_qty": 810814,
                "production_achievement_pct": 83.5,
                "present_employees": 5047,
                "absent_employees": 185,
                "production_per_present_employee": 160.7,
            },
            {
                "shift_id": "B",
                "target_qty": 971520,
                "actual_qty": 805188,
                "production_achievement_pct": 82.9,
                "present_employees": 5052,
                "absent_employees": 181,
                "production_per_present_employee": 159.4,
            },
            {
                "shift_id": "C",
                "target_qty": 971520,
                "actual_qty": 808182,
                "production_achievement_pct": 83.2,
                "present_employees": 5040,
                "absent_employees": 188,
                "production_per_present_employee": 160.4,
            },
        ],
        "productivity_note": "Throughput reflects actual good and finished units per present shift employee.",
    }

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_shift_efficiency_analytics", return_value=mock_data) as mock_svc:
            res = get_shift_efficiency_analytics.invoke({})
            assert mock_svc.called
            assert res["status"] == "success"
            assert res["total_shifts"] == 3
            assert len(res["items"]) == 3
            assert res["items"][0]["shift_id"] == "A"
            assert res["items"][0]["production_per_present_employee"] == 160.7


def test_get_shift_efficiency_analytics_validation_and_errors():
    """Verify validation and database error handling for shift efficiency tool."""
    res_inv = get_shift_efficiency_analytics.invoke({"end_date": "invalid-end"})
    assert res_inv["status"] == "error"
    assert res_inv["error_type"] == "ValidationError"

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_shift_efficiency_analytics", side_effect=Exception("Connection dropped")):
            res = get_shift_efficiency_analytics.invoke({})
            assert res["status"] == "error"
            assert res["error_type"] == "DatabaseError"


# ============================================================================
# 5. SKILLS ANALYTICS TOOL TESTS
# ============================================================================


def test_get_skills_analytics_success():
    """Verify get_skills_analytics retrieves skill grades (L1-L4) and certification distribution."""
    mock_data = {
        "total_employees": 180,
        "skill_grade_distribution": [
            {"skill_grade": "L1", "employee_count": 43, "percentage": 23.9},
            {"skill_grade": "L2", "employee_count": 54, "percentage": 30.0},
            {"skill_grade": "L3", "employee_count": 38, "percentage": 21.1},
            {"skill_grade": "L4", "employee_count": 45, "percentage": 25.0},
        ],
        "certification_distribution": [
            {"certification": "IPC-A-610", "employee_count": 34, "percentage": 18.9},
            {"certification": "First Aid", "employee_count": 34, "percentage": 18.9},
        ],
        "department_skills": [],
        "section_skills": [],
        "team_skills": [],
        "active_skill_distribution": [],
    }

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_skills_analytics", return_value=mock_data) as mock_svc:
            res = get_skills_analytics.invoke({"department_id": "DEPT-01"})
            assert mock_svc.called
            assert res["status"] == "success"
            assert res["total_employees"] == 180
            assert len(res["skill_grade_distribution"]) == 4
            assert res["skill_grade_distribution"][2]["skill_grade"] == "L3"
            assert res["skill_grade_distribution"][2]["employee_count"] == 38
            assert res["filters_applied"]["department_id"] == "DEPT-01"


def test_get_skills_analytics_database_error():
    """Verify get_skills_analytics handles errors cleanly."""
    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_skills_analytics", side_effect=Exception("Database lock")):
            res = get_skills_analytics.invoke({})
            assert res["status"] == "error"
            assert res["error_type"] == "DatabaseError"


# ============================================================================
# 6. COMPLIANCE ANALYTICS TOOL TESTS
# ============================================================================


def test_get_compliance_analytics_success():
    """Verify get_compliance_analytics retrieves training compliance and skill match rates."""
    mock_data = {
        "total_compliance_records": 16560,
        "current_count": 16162,
        "expired_count": 398,
        "training_compliance_pct": 97.6,
        "total_skill_match_records": 16560,
        "matched_count": 15918,
        "gap_count": 642,
        "skill_match_pct": 96.1,
        "department_wise": [
            {
                "department_id": "DEPT-01",
                "department_name": "Production",
                "compliance_pct": 97.7,
                "skill_match_pct": 96.1,
            }
        ],
        "section_wise": [],
        "shift_wise": [
            {"shift_id": "A", "compliance_pct": 97.4, "skill_match_pct": 95.8},
            {"shift_id": "B", "compliance_pct": 97.7, "skill_match_pct": 96.5},
            {"shift_id": "C", "compliance_pct": 97.7, "skill_match_pct": 96.0},
        ],
        "daily_trend": [],
        "denominator_note": "Calculated across total verified attendance records in selected date range.",
    }

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_compliance_analytics", return_value=mock_data) as mock_svc:
            res = get_compliance_analytics.invoke({})
            assert mock_svc.called
            assert res["status"] == "success"
            assert res["training_compliance_pct"] == 97.6
            assert res["current_count"] == 16162
            assert res["expired_count"] == 398
            assert res["skill_match_pct"] == 96.1
            assert res["gap_count"] == 642
            assert len(res["shift_wise"]) == 3


def test_get_compliance_analytics_validation_and_errors():
    """Verify validation and database error handling for compliance tool."""
    res_inv = get_compliance_analytics.invoke({"start_date": "bad_date"})
    assert res_inv["status"] == "error"
    assert res_inv["error_type"] == "ValidationError"

    with patch("app.agents.tools.workforce_tools._get_tool_db_session", side_effect=_mock_db_session):
        with patch("app.agents.tools.workforce_tools.workforce_analytics_service.get_compliance_analytics", side_effect=Exception("Neon DB connection dropped")):
            res = get_compliance_analytics.invoke({})
            assert res["status"] == "error"
            assert res["error_type"] == "DatabaseError"


# ============================================================================
# 7. END-TO-END CHAT INTEGRATION WITH NEW TOOLS
# ============================================================================


@pytest.mark.parametrize(
    "tool_to_call,user_message",
    [
        ("get_overtime_analytics", "Which shift has the highest overtime?"),
        ("get_team_production_analytics", "Which team has the highest production?"),
        ("get_shift_efficiency_analytics", "Compare efficiency across shifts"),
        ("get_skills_analytics", "How many employees belong to L3 skill grade?"),
        ("get_compliance_analytics", "What is the current training compliance rate?"),
    ],
)
def test_agent_chat_dispatches_new_analytics_tools(tool_to_call: str, user_message: str):
    """Verify that POST /api/v1/agent/chat successfully triggers and executes each new analytics tool."""
    fake_model = FakeToolCallingChatModel(
        target_tool=tool_to_call,
        target_args={},
        final_answer=f"Verified analytical answer using {tool_to_call} facts.",
    )

    register_llm_provider("test_fake", lambda: fake_model)

    with patch.dict(os.environ, {"LLM_PROVIDER": "test_fake"}, clear=False):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/agent/chat",
                json={"message": user_message, "conversation_id": None},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["conversation_id"] is not None
            assert tool_to_call in data["tools_used"], f"Expected {tool_to_call} in {data['tools_used']}"
            assert data["data_available"] is True
            assert "Verified analytical answer" in data["answer"]


# ============================================================================
# 8. GUARDRAILS & SECURITY (No Unrestricted SQL Execution)
# ============================================================================


def test_no_unrestricted_sql_execution():
    """Verify that none of the registered tools accept or execute arbitrary SQL strings."""
    for tool_instance in tool_registry.get_registered_tools():
        args_schema = tool_instance.args
        for param_name in args_schema.keys():
            # Ensure no generic sql, query, or statement parameter exists
            assert param_name.lower() not in {"sql", "query", "statement", "raw_sql", "execute_sql"}, (
                f"Tool '{tool_instance.name}' exposes unrestricted SQL parameter '{param_name}'!"
            )


# ============================================================================
# 9. LIVE DATABASE VERIFICATION (Read-Only Neon PostgreSQL)
# ============================================================================


def test_live_database_new_tools_execution():
    """Verify that all 5 new tools run against the actual read-only Neon database without errors."""
    # Tool 1: Overtime
    ot_res = get_overtime_analytics.invoke({})
    assert ot_res["status"] == "success"
    assert ot_res["total_overtime_hours"] > 0
    assert len(ot_res["shift_wise"]) == 3

    # Tool 2: Team Production
    tp_res = get_team_production_analytics.invoke({})
    assert tp_res["status"] == "success"
    assert tp_res["total_teams"] > 0
    assert tp_res["total_actual_qty"] > 0

    # Tool 3: Shift Efficiency
    se_res = get_shift_efficiency_analytics.invoke({})
    assert se_res["status"] == "success"
    assert se_res["total_shifts"] == 3
    assert len(se_res["items"]) == 3

    # Tool 4: Skills
    sk_res = get_skills_analytics.invoke({})
    assert sk_res["status"] == "success"
    assert sk_res["total_employees"] == 180
    assert len(sk_res["skill_grade_distribution"]) == 4

    # Tool 5: Compliance
    cp_res = get_compliance_analytics.invoke({})
    assert cp_res["status"] == "success"
    assert cp_res["training_compliance_pct"] > 90.0
    assert cp_res["skill_match_pct"] > 90.0

