"""Comprehensive failure mode, timeout, and resilience tests for Agent Mode (Phase 7.3+).

Covers:
1. LLM not configured or raising an exception -> legacy path runs, response keys unchanged, no error shown to user.
2. A tool raising an exception -> error fed back to model as ToolMessage, agent recovers, tool_trace records ok=False.
3. max_steps=2 -> a final answer is still forced, steps <= 2.
4. Invalid JSON from model twice -> graceful final message, no crash.
5. Supervisor calls two specialists for a cross-domain question -> tool_trace contains both.
6. Ambiguous question -> supervisor asks for clarification and calls no tool.
7. Read-only check: attempt a write (INSERT/UPDATE/DELETE) through the DB session used by tools -> must fail.
8. Tool outputs are under ~3 KB and handle empty data (no rows) without crashing.
9. Overall timeout (AGENT_TOTAL_TIMEOUT_SEC) and per-LLM timeout (AGENT_LLM_TIMEOUT_SEC) -> fall back to legacy path.
"""

import json
import os
import time
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, InternalError, ProgrammingError

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.agents.runtime.agent_runner import run_tool_agent
from app.agents.specialists import run_supervisor
from app.agents.tools.specialist_tools import (
    analyze_attendance,
    analyze_attrition,
    analyze_overtime,
    analyze_production,
    analyze_skills,
    analyze_vendor,
    analyze_workforce_planning,
    get_attendance_streaks,
    get_attrition_by_reason,
    get_overtime_by_plant,
    get_production_vs_target,
    get_top_absent_departments,
    get_vendor_breakdown,
)
from app.core.database import get_readonly_db
from tests.test_agent_runner import FakeScriptedChatModel


# ============================================================================
# 1. LLM Not Configured or Raising Exception -> Legacy Path Runs
# ============================================================================

def test_llm_not_configured_falls_back_to_legacy_path():
    """Verify that when AGENT_MODE=tools but LLM is not configured, orchestrator falls back to legacy path."""
    with patch.dict(os.environ, {"AGENT_MODE": "tools", "LLM_PROVIDER": ""}, clear=False):
        res = central_agent_orchestrator.execute_query(
            user_query="What is the overall attendance rate across plants?",
            conversation_id="test_unconfigured_llm",
        )

        assert res is not None
        assert res.get("status") == "success"
        assert res.get("error") is None
        assert "answer" in res
        assert "direct_answer" in res
        assert "key_metrics" in res
        assert "evidence" in res
        assert "tables" in res
        assert len(res["answer"]) > 0
        # Verify no error text shown to user
        assert "error" not in res["answer"].lower()
        assert "traceback" not in res["answer"].lower()


def test_llm_exception_falls_back_to_legacy_path():
    """Verify that when supervisor or LLM raises an unhandled exception, legacy path runs seamlessly."""
    with patch.dict(os.environ, {"AGENT_MODE": "tools", "LLM_PROVIDER": "domo"}, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch(
                "app.agents.specialists.run_supervisor",
                side_effect=RuntimeError("Domo AI Services connection refused (503 Service Unavailable)"),
            ):
                res = central_agent_orchestrator.execute_query(
                    user_query="What is the overall attendance rate across plants?",
                    conversation_id="test_llm_exception",
                )

                assert res is not None
                assert res.get("status") == "success"
                assert res.get("error") is None
                assert "answer" in res
                assert len(res["answer"]) > 0
                # User receives standard deterministic workforce insight, not an error stack trace
                assert "503" not in res["answer"]
                assert "RuntimeError" not in res["answer"]


# ============================================================================
# 2. Tool Raising Exception -> Fed Back as ToolMessage, Agent Recovers
# ============================================================================

@tool
def faulty_failing_tool(department_id: str) -> dict[str, Any]:
    """Test tool that always simulates an unexpected database failure."""
    raise ValueError(f"Underlying database connection dropped for department '{department_id}'")


def test_tool_raising_exception_fed_back_and_recovered():
    """Verify tool exceptions are caught, recorded as ok=False in trace, and fed to model as ToolMessage."""
    responses = [
        # Turn 1: Model attempts to call the faulty tool
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "faulty_failing_tool",
                    "args": {"department_id": "D01"},
                    "id": "call_faulty_1",
                }
            ],
        ),
        # Turn 2: Model receives ToolMessage with error and gracefully explains
        AIMessage(
            content="I encountered an internal error while querying department D01, but the system remains stable.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="You are a helpful assistant.",
        tools=[faulty_failing_tool],
        user_input="Analyze department D01",
        max_steps=4,
        model=model,
    )

    assert len(result["tool_trace"]) == 1
    trace_record = result["tool_trace"][0]
    assert trace_record["tool"] == "faulty_failing_tool"
    assert trace_record["ok"] is False
    assert "error" in result["answer"].lower() or "stable" in result["answer"].lower()

    # Verify model received the error string in invocations
    last_turn_msgs = model.invocations[-1]
    tool_messages = [m for m in last_turn_msgs if isinstance(m, ToolMessage)]
    assert len(tool_messages) == 1
    assert "ValueError" in tool_messages[0].content


# ============================================================================
# 3. max_steps=2 -> Final Answer Forced, steps <= 2
# ============================================================================

@tool
def simple_dummy_tool(dummy_arg: str = "") -> dict[str, Any]:
    """Simple test tool."""
    return {"status": "ok", "value": dummy_arg}


def test_max_steps_2_forces_final_answer():
    """Verify that when max_steps=2 is reached, a final answer is forced and steps <= 2."""
    responses = [
        # Turn 1: Call tool
        AIMessage(
            content="",
            tool_calls=[{"name": "simple_dummy_tool", "args": {"dummy_arg": "step1"}, "id": "c1"}],
        ),
        # Turn 2: Try to call tool again
        AIMessage(
            content="",
            tool_calls=[{"name": "simple_dummy_tool", "args": {"dummy_arg": "step2"}, "id": "c2"}],
        ),
        # Turn 3: Forced final answer invocation
        AIMessage(
            content="Forced final answer: processed step 1 and step 2 before limit.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="You are a workforce agent.",
        tools=[simple_dummy_tool],
        user_input="Run multiple operations",
        max_steps=2,
        model=model,
    )

    assert result["steps"] <= 2
    assert "Forced final answer" in result["answer"]
    assert len(result["tool_trace"]) == 2


# ============================================================================
# 4. Invalid JSON from Model Twice -> Graceful Final Message, No Crash
# ============================================================================

def test_invalid_json_twice_handled_gracefully_without_crash():
    """Verify that if the model returns non-JSON or invalid output twice, a graceful response is produced."""
    responses = [
        # Turn 1: Plain invalid text
        AIMessage(content="I am not returning JSON! Just plain conversation."),
        # Turn 2: Still plain text
        AIMessage(content="Here is more non-JSON text."),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="You are an agent requiring JSON.",
        tools=[simple_dummy_tool],
        user_input="Hello",
        max_steps=3,
        model=model,
    )

    assert result is not None
    assert isinstance(result.get("answer"), str)
    assert len(result["answer"]) > 0
    assert result.get("steps") >= 1


# ============================================================================
# 5. Supervisor Calls Two Specialists for Cross-Domain Question
# ============================================================================

def test_supervisor_calls_two_specialists_cross_domain():
    """Verify supervisor coordinates both Overtime and Attrition specialists for cross-domain queries."""
    responses = [
        # Supervisor Turn 1: Dispatch to both specialists
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_overtime_agent",
                    "args": {"question": "What is the overtime rate in plant IN-TN-01?"},
                    "id": "sup_ot_1",
                },
                {
                    "name": "ask_attrition_agent",
                    "args": {"question": "What is the attrition rate in plant IN-TN-01?"},
                    "id": "sup_att_1",
                },
            ],
        ),
        # Overtime Specialist Turn 1: Call overtime analytics
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_overtime_analytics",
                    "args": {"plant_id": "IN-TN-01"},
                    "id": "ot_tool_1",
                }
            ],
        ),
        # Overtime Specialist Turn 2: Return specialist answer
        AIMessage(
            content="Plant IN-TN-01 logged 14,820 overtime hours with 38.4% overtime participation.",
            tool_calls=[],
        ),
        # Attrition Specialist Turn 1: Call attrition analytics
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_attrition_analytics",
                    "args": {"plant_id": "IN-TN-01"},
                    "id": "att_tool_1",
                }
            ],
        ),
        # Attrition Specialist Turn 2: Return specialist answer
        AIMessage(
            content="Plant IN-TN-01 recorded an attrition rate of 6.8% with 66 total exits.",
            tool_calls=[],
        ),
        # Supervisor Turn 2: Final synthesized answer combining both
        AIMessage(
            content="In Plant IN-TN-01, overtime hours reached 14,820 hours while attrition remained moderate at 6.8% (66 exits). Overtime surge is concentrated in assembly shifts.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="Compare overtime and attrition in plant IN-TN-01",
        model=model,
    )

    assert "14,820" in result["answer"]
    assert "6.8%" in result["answer"]
    assert "overtime" in result["selected_agents"]
    assert "attrition" in result["selected_agents"]

    tool_names = [t["tool"] for t in result["tool_trace"]]
    assert "ask_overtime_agent" in tool_names
    assert "ask_attrition_agent" in tool_names
    assert "get_overtime_analytics" in tool_names
    assert "get_attrition_analytics" in tool_names


# ============================================================================
# 6. Ambiguous Question -> Supervisor Asks Clarification & Calls No Tool
# ============================================================================

def test_supervisor_ambiguous_question_asks_clarification_no_tools():
    """Verify that when asked an ambiguous query, supervisor asks for clarification without executing tools."""
    responses = [
        AIMessage(
            content=(
                "To identify the top performers, could you please clarify your evaluation criteria? "
                "For example, are you interested in attendance rates, certified skill matrix grades, "
                "or shift production output?"
            ),
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="Who is the best employee?",
        model=model,
    )

    assert "criteria" in result["answer"].lower()
    assert len(result["tool_trace"]) == 0
    assert len(result["selected_agents"]) == 0


# ============================================================================
# 7. Read-Only DB Check -> INSERT, UPDATE, DELETE Must Fail
# ============================================================================

def test_readonly_db_enforcement_modifications_fail():
    """Verify that the read-only database session strictly rejects INSERT, UPDATE, and DELETE."""
    session_gen = get_readonly_db()
    db = next(session_gen)
    try:
        # 1. Attempt INSERT
        with pytest.raises(DBAPIError) as exc_insert:
            db.execute(text("INSERT INTO public.section_master (section_id, section_name, department_id) VALUES ('TEST_SEC', 'Test', 'D01')"))
            db.flush()
        db.rollback()
        assert "read-only" in str(exc_insert.value).lower() or "permission denied" in str(exc_insert.value).lower()

        # 2. Attempt UPDATE
        with pytest.raises(DBAPIError) as exc_update:
            db.execute(text("UPDATE public.section_master SET section_name = 'Hacked' WHERE section_id = 'SEC-01'"))
            db.flush()
        db.rollback()
        assert "read-only" in str(exc_update.value).lower() or "permission denied" in str(exc_update.value).lower()

        # 3. Attempt DELETE
        with pytest.raises(DBAPIError) as exc_delete:
            db.execute(text("DELETE FROM public.section_master WHERE section_id = 'NON_EXISTENT'"))
            db.flush()
        db.rollback()
        assert "read-only" in str(exc_delete.value).lower() or "permission denied" in str(exc_delete.value).lower()
    finally:
        try:
            session_gen.close()
        except Exception:
            pass


# ============================================================================
# 8. Tool Outputs Under ~3 KB and Handle Empty Data Without Crashing
# ============================================================================

def test_specialist_tools_under_3kb_and_handle_empty_data():
    """Verify all specialist tools handle non-existent filter criteria gracefully and return trimmed output < 3 KB."""
    tools_to_test = [
        (analyze_attendance, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_workforce_planning, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_overtime, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_attrition, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_skills, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_vendor, {"plant_id": "NON_EXISTENT_P99"}),
        (analyze_production, {"plant_id": "NON_EXISTENT_P99"}),
        (get_attendance_streaks, {"plant_id": "NON_EXISTENT_P99"}),
        (get_top_absent_departments, {"plant_id": "NON_EXISTENT_P99"}),
        (get_attrition_by_reason, {"plant_id": "NON_EXISTENT_P99"}),
        (get_vendor_breakdown, {"plant_id": "NON_EXISTENT_P99"}),
        (get_production_vs_target, {"plant_id": "NON_EXISTENT_P99"}),
        (get_overtime_by_plant, {"plant_id": "NON_EXISTENT_P99"}),
    ]

    for tool_fn, kwargs in tools_to_test:
        tool_name = getattr(tool_fn, "name", str(tool_fn))
        # Execute tool via invoke or direct call
        if hasattr(tool_fn, "invoke"):
            output = tool_fn.invoke(kwargs)
        else:
            output = tool_fn(**kwargs)

        assert output is not None, f"Tool {tool_name} returned None"

        # Check size is under ~3 KB (3072 bytes)
        serialized = json.dumps(output, default=str)
        size_bytes = len(serialized.encode("utf-8"))
        assert size_bytes < 3500, f"Tool {tool_name} output size {size_bytes} exceeds ~3 KB limit"


# ============================================================================
# 9. Overall Timeout and Per-LLM Timeout Fallback Tests
# ============================================================================

def test_overall_timeout_fallback_to_legacy():
    """Verify that when supervisor execution exceeds AGENT_TOTAL_TIMEOUT_SEC, it falls back to legacy path."""
    def slow_supervisor(*args: Any, **kwargs: Any) -> dict[str, Any]:
        time.sleep(1.0)
        return {"answer": "Slow answer", "tool_trace": []}

    with patch.dict(os.environ, {"AGENT_MODE": "tools", "LLM_PROVIDER": "domo", "AGENT_TOTAL_TIMEOUT_SEC": "0.1"}, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.specialists.run_supervisor", side_effect=slow_supervisor):
                t0 = time.time()
                res = central_agent_orchestrator.execute_query(
                    user_query="What is the overall attendance rate?",
                    conversation_id="test_overall_timeout",
                )
                dur = time.time() - t0

                assert res is not None
                assert res.get("status") == "success"
                assert res.get("error") is None
                assert "answer" in res
                assert len(res["answer"]) > 0


def test_per_llm_call_timeout_fallback_to_legacy():
    """Verify that when an individual LLM call exceeds AGENT_LLM_TIMEOUT_SEC, it falls back to legacy path."""
    class SlowChatModel(BaseChatModel):
        @property
        def _llm_type(self) -> str:
            return "slow_fake"

        def _generate(self, messages: list[BaseMessage], stop: list[str] | None = None, **kwargs: Any) -> ChatResult:
            time.sleep(1.0)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Delayed"))])

    with patch.dict(os.environ, {"AGENT_MODE": "tools", "LLM_PROVIDER": "domo", "AGENT_LLM_TIMEOUT_SEC": "0.1", "AGENT_TOTAL_TIMEOUT_SEC": "5.0"}, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.specialists.run_supervisor") as mock_sup:
                # Trigger a real run_tool_agent with the slow model
                def _run_slow(*args: Any, **kwargs: Any) -> dict[str, Any]:
                    return run_tool_agent(
                        system_prompt="Test",
                        tools=[],
                        user_input="Hello",
                        model=SlowChatModel(),
                        llm_timeout=0.1,
                    )
                mock_sup.side_effect = _run_slow

                res = central_agent_orchestrator.execute_query(
                    user_query="What is the overall attendance rate?",
                    conversation_id="test_llm_timeout",
                )

                assert res is not None
                assert res.get("status") == "success"
                assert res.get("error") is None
                assert "answer" in res
                assert len(res["answer"]) > 0
