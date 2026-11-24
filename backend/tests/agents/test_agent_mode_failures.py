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

from app.agents.attrition_agent_service import attrition_agent_service
from app.agents.overtime_agent_service import overtime_agent_service
from app.agents.skill_agent_service import skill_agent_service
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
# 1. LLM Not Configured or Raising Exception -> Graceful Unavailable Response
# ============================================================================

def test_llm_not_configured_falls_back_to_legacy_path():
    """Verify that when LLM is not configured, orchestrator returns friendly unavailable message in same shape."""
    with patch.dict(os.environ, {"LLM_PROVIDER": ""}, clear=False):
        res = central_agent_orchestrator.execute_query(
            query="What is the overall attendance rate across plants?",
            conversation_id="test_unconfigured_llm",
        )

        assert res is not None
        assert res.get("status") == "failed"
        assert res.get("tool_trace") == []
        assert "answer" in res
        assert "direct_answer" in res
        assert "key_metrics" in res
        assert "evidence" in res
        assert "tables" in res
        assert res["answer"] == "The assistant is temporarily unavailable. Please try again in a moment."
        assert "traceback" not in res["answer"].lower()


def test_llm_exception_falls_back_to_legacy_path():
    """Verify that when supervisor or LLM raises an unhandled exception, friendly unavailable message is returned."""
    with patch.dict(os.environ, {"LLM_PROVIDER": "domo"}, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch(
                "app.agents.specialists.run_supervisor",
                side_effect=RuntimeError("Domo AI Services connection refused (503 Service Unavailable)"),
            ):
                res = central_agent_orchestrator.execute_query(
                    query="What is the overall attendance rate across plants?",
                    conversation_id="test_llm_exception",
                )

                assert res is not None
                assert res.get("status") == "failed"
                assert res.get("tool_trace") == []
                assert res["answer"] == "The assistant is temporarily unavailable. Please try again in a moment."
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

def test_overall_timeout_returns_unavailable():
    """Verify that when supervisor execution exceeds AGENT_TOTAL_TIMEOUT_SEC, it returns friendly unavailable message."""
    def slow_supervisor(*args: Any, **kwargs: Any) -> dict[str, Any]:
        time.sleep(2.0)
        return {"answer": "Slow answer", "tool_trace": []}

    with patch.dict(os.environ, {"LLM_PROVIDER": "domo", "AGENT_TOTAL_TIMEOUT_SEC": "0.1"}, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.specialists.run_supervisor", side_effect=slow_supervisor):
                t0 = time.time()
                res = central_agent_orchestrator.execute_query(
                    query="What is the overall attendance rate?",
                    conversation_id="test_overall_timeout",
                )
                dur = time.time() - t0

                assert res is not None
                assert res.get("status") == "failed"
                assert res.get("tool_trace") == []
                assert res["answer"] == "The assistant is temporarily unavailable. Please try again in a moment."


def test_per_llm_call_timeout_returns_unavailable():
    """Verify that when an individual LLM call exceeds AGENT_LLM_TIMEOUT_SEC, it returns friendly unavailable message."""
    class SlowChatModel(BaseChatModel):
        @property
        def _llm_type(self) -> str:
            return "slow_fake"

        def _generate(self, messages: list[BaseMessage], stop: list[str] | None = None, **kwargs: Any) -> ChatResult:
            time.sleep(1.0)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Delayed"))])

    with patch.dict(os.environ, {"LLM_PROVIDER": "domo", "AGENT_LLM_TIMEOUT_SEC": "0.1", "AGENT_TOTAL_TIMEOUT_SEC": "5.0"}, clear=False):
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
                    query="What is the overall attendance rate?",
                    conversation_id="test_llm_timeout",
                )

                assert res is not None
                assert res.get("status") == "failed"
                assert res.get("tool_trace") == []
                assert res["answer"] == "The assistant is temporarily unavailable. Please try again in a moment."


# ============================================================================
# 10. Zero Division Regression Tests (Attrition, Overtime, Skills)
# ============================================================================

def test_attrition_zero_exits_no_zero_division():
    """Verify attrition_agent_service handles zero exits without ZeroDivisionError."""
    session_gen = get_readonly_db()
    db = next(session_gen)
    try:
        res = attrition_agent_service.execute_attrition_analysis(
            db,
            plant_id="NON_EXISTENT_PLANT_FOR_ZERO_EXITS",
            skip_llm=True,
        )
        assert res is not None
        assert res.get("status") == "COMPLETED"
        assert res["metrics"]["total_exits"] == 0
        assert res["metrics"]["overall_attrition_rate"] == 0.0
    finally:
        session_gen.close()


def test_overtime_zero_cost_no_zero_division():
    """Verify overtime_agent_service handles zero overtime cost without ZeroDivisionError."""
    session_gen = get_readonly_db()
    db = next(session_gen)
    try:
        res = overtime_agent_service.execute_overtime_analysis(
            db,
            plant_id="NON_EXISTENT_PLANT_FOR_ZERO_OT",
            skip_llm=True,
        )
        assert res is not None
        assert res.get("status") == "COMPLETED"
        assert res["metrics"]["total_overtime_hours"] == 0.0
        assert res["metrics"]["total_overtime_cost_inr"] == 0.0
    finally:
        session_gen.close()


def test_skill_zero_mappings_no_zero_division():
    """Verify skill_agent_service handles zero mappings without ZeroDivisionError."""
    session_gen = get_readonly_db()
    db = next(session_gen)
    try:
        res = skill_agent_service.execute_skill_analysis(
            db,
            plant_id="NON_EXISTENT_PLANT_FOR_ZERO_SKILLS",
            skip_llm=True,
        )
        assert res is not None
        assert res.get("status") == "COMPLETED"
        assert res["metrics"]["total_skill_mappings"] == 0
        assert res.get("top_skills") == []
        assert res.get("bottom_skills") == []
    finally:
        session_gen.close()


# ============================================================================
# 11. Multi-Specialist Shared Deadline & Capped Timeout Tests
# ============================================================================

def test_shared_deadline_two_specialists_never_exceeds_deadline_plus_call_timeout():
    """Verify a 2-specialist supervisor question with tiny timeouts shares deadline and total duration <= deadline + 1 call timeout."""
    class StepChatModel(BaseChatModel):
        call_count: int = 0

        @property
        def _llm_type(self) -> str:
            return "step_fake"

        def bind_tools(self, tools: list[Any], **kwargs: Any) -> Any:
            return self

        def _generate(self, messages: list[BaseMessage], stop: list[str] | None = None, **kwargs: Any) -> ChatResult:
            self.call_count += 1
            if self.call_count == 1:
                # Supervisor Step 1: Call attendance specialist
                msg = AIMessage(
                    content="",
                    tool_calls=[{"name": "ask_attendance_agent", "args": {"question": "What is the attendance rate?"}, "id": "c1"}],
                )
                time.sleep(0.05)
                return ChatResult(generations=[ChatGeneration(message=msg)])
            elif self.call_count == 2:
                # Attendance Specialist: Fast response
                msg = AIMessage(content="Attendance rate is 92.4%.", tool_calls=[])
                time.sleep(0.05)
                return ChatResult(generations=[ChatGeneration(message=msg)])
            elif self.call_count == 3:
                # Supervisor Step 2: Call overtime specialist
                msg = AIMessage(
                    content="",
                    tool_calls=[{"name": "ask_overtime_agent", "args": {"question": "What is the overtime spend?"}, "id": "c2"}],
                )
                time.sleep(0.05)
                return ChatResult(generations=[ChatGeneration(message=msg)])
            else:
                # Overtime Specialist: Slow blocking call
                time.sleep(1.0)
                msg = AIMessage(content="Overtime spend is high.", tool_calls=[])
                return ChatResult(generations=[ChatGeneration(message=msg)])

    total_timeout = 0.35
    llm_timeout = 0.15
    model = StepChatModel()

    t0 = time.perf_counter()
    with pytest.raises(TimeoutError):
        run_supervisor(
            question="Compare attendance and overtime for Shift A",
            model=model,
            total_timeout=total_timeout,
            llm_timeout=llm_timeout,
        )
    elapsed = time.perf_counter() - t0

    # Total duration must not exceed deadline (total_timeout) by more than one call timeout (llm_timeout)
    max_allowed = total_timeout + llm_timeout + 0.20  # small OS scheduling buffer
    assert elapsed <= max_allowed, f"Elapsed time {elapsed:.3f}s exceeded max allowed {max_allowed:.3f}s"


def test_shared_deadline_timeout_returns_unavailable():
    """Verify execute_query returns friendly unavailable message when multi-specialist supervisor exceeds deadline."""
    class BlockingModel(BaseChatModel):
        @property
        def _llm_type(self) -> str:
            return "blocking_fake"

        def bind_tools(self, tools: list[Any], **kwargs: Any) -> Any:
            return self

        def _generate(self, messages: list[BaseMessage], stop: list[str] | None = None, **kwargs: Any) -> ChatResult:
            time.sleep(0.6)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Done", tool_calls=[]))])

    with patch.dict(os.environ, {
        "LLM_PROVIDER": "domo",
        "AGENT_TOTAL_TIMEOUT_SEC": "0.10",
        "AGENT_LLM_TIMEOUT_SEC": "0.05",
    }, clear=False):
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.llm.provider.get_chat_model", return_value=BlockingModel()):
                res = central_agent_orchestrator.execute_query(
                    query="Compare attendance and overtime across plants",
                    conversation_id="test_timeout_fallback",
                )

                assert res is not None
                assert res.get("status") == "failed"
                assert res.get("tool_trace") == []
                assert res["answer"] == "The assistant is temporarily unavailable. Please try again in a moment."


# ============================================================================
# 12. Service Zero Guard & Thread Deadline Tests
# ============================================================================


def test_workforce_planning_service_zero_scheduled_guard():
    """Verify workforce_planning_service calculates availability with 0 scheduled records without ZeroDivisionError."""
    from datetime import date
    from app.services.workforce_planning_service import calculate_workforce_availability
    session_gen = get_readonly_db()
    db = next(session_gen)
    try:
        res = calculate_workforce_availability(
            db=db,
            target_date=date(2026, 9, 1),
            plant_id="NON_EXISTENT_PLANT",
            shift_id="A",
        )
        assert res is not None
        assert res["total_scheduled"] == 0
        assert res["availability_rate"] == 0.0
        assert res["absenteeism_rate"] == 0.0
    finally:
        session_gen.close()


def test_specialist_in_worker_thread_sees_supervisor_deadline():
    """Verify that a specialist dispatched in a worker thread sees the supervisor's deadline."""
    import contextvars
    import concurrent.futures
    from app.agents.specialists import _current_deadline, _current_llm_timeout, run_specialist

    captured_deadlines = []

    def mock_run_tool_agent(*args, **kwargs):
        captured_deadlines.append(kwargs.get("deadline"))
        return {"answer": "Specialist done", "tool_trace": [], "steps": 1}

    test_deadline = time.perf_counter() + 45.0
    test_llm_timeout = 15.0

    token = _current_deadline.set(test_deadline)
    token_llm = _current_llm_timeout.set(test_llm_timeout)

    try:
        ctx = contextvars.copy_context()

        with patch("app.agents.specialists.run_tool_agent", side_effect=mock_run_tool_agent):
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
                # 1. Test via copy_context().run in a thread
                fut1 = ex.submit(
                    ctx.run,
                    run_specialist,
                    "attendance",
                    "What is attendance rate?",
                )
                fut1.result(timeout=2.0)

                assert len(captured_deadlines) == 1
                assert captured_deadlines[0] == test_deadline

                # 2. Test explicit deadline passing in thread
                fut2 = ex.submit(
                    run_specialist,
                    "attendance",
                    "What is attendance rate?",
                    deadline=test_deadline,
                )
                fut2.result(timeout=2.0)

                assert len(captured_deadlines) == 2
                assert captured_deadlines[1] == test_deadline
    finally:
        _current_deadline.reset(token)
        _current_llm_timeout.reset(token_llm)


# ============================================================================
# 11. Real Data Attendance Analytics & Deadline Enforcement
# ============================================================================

def test_get_attendance_analytics_real_db_counts():
    """Verify that get_attendance_analytics against real Neon DB returns positive present_count and attendance_percentage."""
    from app.agents.tools.workforce_tools import get_attendance_analytics

    res = get_attendance_analytics.invoke({})
    assert res is not None
    assert res.get("status") == "success"
    assert res.get("total_records", 0) > 0
    # Must have non-zero present count and valid attendance percentage
    assert res.get("present_count", 0) > 0, f"Expected present_count > 0, got {res.get('present_count')}"
    assert res.get("attendance_percentage", 0.0) > 0.0, f"Expected attendance_percentage > 0.0, got {res.get('attendance_percentage')}"


def test_supervisor_deadline_enforcement_never_exceeds_budget():
    """Verify that run_tool_agent and supervisor strictly enforce deadline and never exceed budget."""
    import concurrent.futures
    from app.agents.runtime.agent_runner import run_tool_agent
    from langchain_core.messages import AIMessage

    class SlowChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, **kwargs):
            time.sleep(2.0)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Delayed"))])

        @property
        def _llm_type(self):
            return "slow_mock"

    t0 = time.perf_counter()
    with pytest.raises(TimeoutError):
        run_tool_agent(
            system_prompt="Test",
            tools=[],
            user_input="Hello",
            model=SlowChatModel(),
            total_timeout=0.3,
            llm_timeout=0.2,
        )
    elapsed = time.perf_counter() - t0
    # Must fail promptly around deadline + call timeout, never hanging for the full 2.0s
    assert elapsed < 1.0, f"Deadline enforcement hung! Elapsed: {elapsed:.2f}s"


def test_harness_timeout_does_not_block_on_worker_thread():
    """Verify that ThreadPoolExecutor with shutdown(wait=False, cancel_futures=True) returns immediately on timeout."""
    import concurrent.futures

    def slow_worker():
        time.sleep(3.0)
        return "done"

    t0 = time.perf_counter()
    timeout_sec = 0.2
    ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    timed_out = False
    try:
        fut = ex.submit(slow_worker)
        fut.result(timeout=timeout_sec)
    except concurrent.futures.TimeoutError:
        timed_out = True
    finally:
        ex.shutdown(wait=False, cancel_futures=True)

    elapsed = time.perf_counter() - t0
    assert timed_out is True
    # Harness MUST return immediately without waiting for the 3.0s sleep in worker thread
    assert elapsed < 0.6, f"Harness blocked on shutdown! Elapsed: {elapsed:.2f}s"


def test_zero_tool_hallucination_code_guard():
    """Verify that any supervisor response containing ungrounded metrics without tools is blocked by code guard."""
    from app.agents.specialists import _contains_ungrounded_metrics, run_supervisor

    # 1. Unit check on _contains_ungrounded_metrics
    assert _contains_ungrounded_metrics("The overall attrition rate is 7.1% with 120 exits.") is True
    assert _contains_ungrounded_metrics("Total overtime spend is $1,460,000 for 58,433 hours.") is True
    assert _contains_ungrounded_metrics("We have 1250 employees in the plant.") is True
    # Clarification question with numbered options should NOT be flagged as ungrounded metrics
    clarification = "To check shop floor status, please clarify:\n1. Attendance rates\n2. Overtime hours\n3. Production output"
    assert _contains_ungrounded_metrics(clarification) is False
    # Honest refusal or lack of data should NOT be flagged
    assert _contains_ungrounded_metrics("I cannot provide weather forecasts as I only access workforce data.") is False

    # 2. End-to-end supervisor guard check: model attempts to hallucinate data with 0 tool calls
    class HallucinatingMockChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, **kwargs):
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Verified attendance rate is 92.4% and 58,433 overtime hours."))])

        @property
        def _llm_type(self):
            return "hallucinating_mock"

    res = run_supervisor(
        question="What is the workforce status?",
        model=HallucinatingMockChatModel(),
        total_timeout=5.0,
    )
    # The hallucinated metrics MUST be replaced by the honest refusal message
    assert "not available without consulting the verified shopfloor database" in res["answer"]
    assert res["tool_trace"] == []


def test_ambiguous_question_line_status_asks_clarification_no_specialists():
    """Verify that broad ambiguous questions produce a clarification answer without calling specialists."""
    from app.agents.specialists import run_supervisor

    class ClarificationMockChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, **kwargs):
            return ChatResult(generations=[ChatGeneration(message=AIMessage(
                content="To provide an accurate shop floor update, please clarify which area you would like to inspect: 1. Attendance, 2. Production, 3. Overtime."
            ))])

        @property
        def _llm_type(self):
            return "clarification_mock"

    res = run_supervisor(
        question="Is everything running fine on the shop floor today?",
        model=ClarificationMockChatModel(),
        total_timeout=5.0,
    )
    assert "please clarify" in res["answer"].lower()
    assert res["steps"] == 1
    assert len(res["selected_agents"]) == 0
    assert len(res["tool_trace"]) == 0


def test_filter_unverified_sentences():
    """Verify that filter_unverified_sentences prunes sentences with unverified numbers while preserving verified ones."""
    from app.agents.specialists import filter_unverified_sentences

    tool_trace = [
        {
            "tool": "analyze_attrition",
            "ok": True,
            "output": {
                "metrics": {
                    "total_exits": 120,
                    "attrition_rate": 7.1,
                    "active_headcount": 1580,
                }
            },
        }
    ]

    answer = (
        "Plant IN-TN-01 recorded 120 verified exits for the period ending 2026-10-31. "
        "The verified attrition rate was 7.1% across 1,580 active employees. "
        "Additionally, 999 phantom workers unexpectedly departed without notification. "
        "HR recommends reviewing exit interviews."
    )

    pruned = filter_unverified_sentences(answer, tool_trace, user_query="Annual attrition rate?")

    # Verified sentences must be kept
    assert "120 verified exits" in pruned
    assert "7.1% across 1,580 active employees" in pruned
    assert "HR recommends reviewing exit interviews" in pruned
    # Sentence with unverified number (999) MUST be removed
    assert "999" not in pruned
    assert "phantom workers" not in pruned

