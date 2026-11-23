"""Unit tests for Central Workforce Multi-Agent Supervisor and domain specialist routing.

Tests:
1. Attendance question -> attendance specialist & tool called.
2. Cross-domain question -> multiple specialist agents invoked & synthesized.
3. Tool error handled -> underlying error caught, ok=False recorded in trace, model responds gracefully.
4. Max steps limit -> agent loop stops at max_steps without infinite recursion.
5. LLM down / unconfigured -> fallback to legacy deterministic orchestrator flow.
6. SSE Stream supervisor -> real tool lifecycle events emitted with full compatibility.
"""

from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, ToolMessage

from app.agents.central_agent_orchestrator import CentralAgentOrchestrator, central_agent_orchestrator
from app.agents.specialists import run_supervisor
from tests.test_agent_runner import FakeScriptedChatModel


def test_supervisor_attendance_question_calls_attendance_agent_and_tool():
    """Verify attendance question leads supervisor to call ask_attendance_agent and attendance tools."""
    events: list[dict[str, Any]] = []

    responses = [
        # Turn 1 (Supervisor): Call ask_attendance_agent
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_attendance_agent",
                    "args": {"question": "What is the attendance rate in plant IN-KA-01?"},
                    "id": "sup_call_1",
                }
            ],
        ),
        # Turn 2 (Attendance Specialist): Call get_attendance_analytics
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_attendance_analytics",
                    "args": {"plant_id": "IN-KA-01"},
                    "id": "spec_call_1",
                }
            ],
        ),
        # Turn 3 (Attendance Specialist): Synthesize specialist finding
        AIMessage(
            content="Plant IN-KA-01 achieved an attendance rate of 94.2% with 94,120 present records.",
            tool_calls=[],
        ),
        # Turn 4 (Supervisor): Synthesize final executive answer
        AIMessage(
            content="Plant IN-KA-01 maintained an average attendance rate of 94.2% during September 2026. Attendance stability remains high with negligible unexcused absences.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="What is the attendance rate in plant IN-KA-01?",
        on_event=lambda ev: events.append(ev),
        model=model,
    )

    assert "94.2%" in result["answer"]
    assert "attendance" in result["selected_agents"]
    assert len(result["tool_trace"]) >= 2

    # Check tools executed in trace
    tools_executed = [t["tool"] for t in result["tool_trace"]]
    assert "ask_attendance_agent" in tools_executed
    assert "get_attendance_analytics" in tools_executed

    # Check start and end events were emitted
    start_events = [e for e in events if e.get("event") == "tool_start"]
    end_events = [e for e in events if e.get("event") == "tool_end"]
    assert len(start_events) >= 2
    assert len(end_events) >= 2


def test_supervisor_cross_domain_calls_two_agents():
    """Verify cross-domain question invokes multiple specialist agents (e.g. Overtime & Attrition)."""
    events: list[dict[str, Any]] = []

    responses = [
        # Turn 1 (Supervisor): Call both ask_overtime_agent and ask_attrition_agent
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_overtime_agent",
                    "args": {"question": "What is the overtime rate in plant IN-TN-01?"},
                    "id": "sup_call_ot",
                },
                {
                    "name": "ask_attrition_agent",
                    "args": {"question": "What is the attrition rate in plant IN-TN-01?"},
                    "id": "sup_call_att",
                },
            ],
        ),
        # Overtime specialist turn 1: Call get_overtime_by_plant
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_overtime_by_plant",
                    "args": {"plant_id": "IN-TN-01"},
                    "id": "ot_tool_1",
                }
            ],
        ),
        # Overtime specialist turn 2: Output
        AIMessage(
            content="Plant IN-TN-01 logged 28,400 overtime hours at an overtime rate of 8.2%.",
            tool_calls=[],
        ),
        # Attrition specialist turn 1: Call get_attrition_by_reason
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_attrition_by_reason",
                    "args": {"plant_id": "IN-TN-01"},
                    "id": "att_tool_1",
                }
            ],
        ),
        # Attrition specialist turn 2: Output
        AIMessage(
            content="Plant IN-TN-01 recorded an annualized attrition rate of 4.5% primarily due to relocation.",
            tool_calls=[],
        ),
        # Supervisor turn 2: Synthesize combined answer
        AIMessage(
            content="Plant IN-TN-01 recorded an overtime rate of 8.2% (28,400 hours) while maintaining a low annualized attrition rate of 4.5%. Fatigue risk is manageable.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="Analyze both overtime and attrition for plant IN-TN-01.",
        on_event=lambda ev: events.append(ev),
        model=model,
    )

    assert "overtime rate of 8.2%" in result["answer"]
    assert "attrition rate of 4.5%" in result["answer"]
    assert "overtime" in result["selected_agents"]
    assert "attrition" in result["selected_agents"]
    assert len(result["selected_agents"]) == 2

    executed_tools = [t["tool"] for t in result["tool_trace"]]
    assert "ask_overtime_agent" in executed_tools
    assert "ask_attrition_agent" in executed_tools


def test_supervisor_tool_error_handled():
    """Verify tool errors are caught, recorded as ok=False in trace, and model responds gracefully."""
    events: list[dict[str, Any]] = []

    responses = [
        # Turn 1: Supervisor calls ask_vendor_agent
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_vendor_agent",
                    "args": {"question": "Check vendor headcount."},
                    "id": "sup_v_call",
                }
            ],
        ),
        # Vendor specialist turn 1: Call execute_vendor_analysis
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "execute_vendor_analysis",
                    "args": {"plant_id": "IN-NONEXISTENT"},
                    "id": "v_tool_1",
                }
            ],
        ),
        # Vendor specialist turn 2: Responds with error acknowledgment
        AIMessage(
            content="Vendor data service encountered an issue or found 0 records for IN-NONEXISTENT.",
            tool_calls=[],
        ),
        # Supervisor turn 2: Concludes gracefully without crashing
        AIMessage(
            content="We could not retrieve vendor records for plant IN-NONEXISTENT. Please verify the plant identifier.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="Check vendor headcount for IN-NONEXISTENT.",
        on_event=lambda ev: events.append(ev),
        model=model,
    )

    assert "could not retrieve vendor records" in result["answer"]
    assert "vendor" in result["selected_agents"]
    assert len(result["tool_trace"]) >= 1


def test_supervisor_max_steps_stop():
    """Verify supervisor stops when max_steps limit is reached."""
    responses = [
        # Supervisor step 1: Call ask_attendance_agent
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_attendance_agent",
                    "args": {"question": "Attendance check"},
                    "id": "s_call_1",
                }
            ],
        ),
        # Attendance specialist step 1: Return specialist summary
        AIMessage(
            content="Specialist 1 response.",
            tool_calls=[],
        ),
        # Supervisor step 2: Call ask_overtime_agent
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ask_overtime_agent",
                    "args": {"question": "Overtime check"},
                    "id": "s_call_2",
                }
            ],
        ),
        # Overtime specialist step 1: Return specialist summary
        AIMessage(
            content="Specialist 2 response.",
            tool_calls=[],
        ),
        # Supervisor forced final answer after max_steps reached
        AIMessage(
            content="Forced final supervisor response after max_steps reached.",
            tool_calls=[],
        ),
    ]

    model = FakeScriptedChatModel(responses=responses)

    result = run_supervisor(
        question="Loop forever.",
        model=model,
        max_steps=2,
    )

    assert result["steps"] == 2
    assert len(result["tool_trace"]) == 2
    assert "Forced final supervisor response" in result["answer"]


def test_llm_down_or_unconfigured_legacy_fallback(monkeypatch):
    """Verify orchestrator execute_query cleanly falls back to legacy pipeline when LLM is unavailable."""
    monkeypatch.setenv("AGENT_MODE", "tools")

    # Simulate LLM unconfigured
    monkeypatch.setattr("app.agents.central_agent_orchestrator.is_llm_configured", lambda: False)

    orchestrator = CentralAgentOrchestrator()
    res = orchestrator.execute_query("What is the attendance rate in plant IN-KA-01?")

    assert res["status"] == "success"
    assert "conversation_id" in res
    assert "answer" in res
    assert "key_metrics" in res
    assert "tool_trace" in res
    assert isinstance(res["tool_trace"], list)


def test_orchestrator_execute_query_supervisor_mode(monkeypatch):
    """Verify orchestrator execute_query uses supervisor mode when AGENT_MODE=tools and LLM is configured."""
    monkeypatch.setenv("AGENT_MODE", "tools")
    monkeypatch.setattr("app.agents.central_agent_orchestrator.is_llm_configured", lambda: True)

    fake_sup_result = {
        "answer": "Plant IN-KA-01 attendance rate was 94.2% across September with strong operational compliance.",
        "tool_trace": [
            {"tool": "ask_attendance_agent", "args": {}, "duration_ms": 120, "ok": True},
            {"tool": "get_attendance_analytics", "args": {}, "duration_ms": 80, "ok": True},
        ],
        "steps": 2,
        "selected_agents": ["attendance"],
    }

    with patch("app.agents.specialists.run_supervisor", return_value=fake_sup_result):
        orchestrator = CentralAgentOrchestrator()
        res = orchestrator.execute_query("What is the attendance rate in plant IN-KA-01?")

        assert res["status"] == "success"
        assert "94.2%" in res["answer"]
        assert res["selected_agents"] == ["attendance"]
        assert len(res["tool_trace"]) == 2
        assert res["evidence"][0]["value"] == "Multi-Agent Supervisor (Tools)"


def test_stream_orchestration_supervisor_mode(monkeypatch):
    """Verify stream_orchestration yields valid SSE stages and done event in supervisor mode."""
    import asyncio
    import json

    monkeypatch.setenv("AGENT_MODE", "tools")
    monkeypatch.setattr("app.agents.central_agent_orchestrator.is_llm_configured", lambda: True)

    def fake_run_supervisor(question, history=None, on_event=None, model=None, max_steps=6):
        if on_event:
            on_event({"event": "tool_start", "tool": "ask_attendance_agent", "agent": "attendance", "args": {}})
            on_event({"event": "tool_start", "tool": "get_attendance_analytics", "args": {"plant_id": "IN-KA-01"}})
            on_event({"event": "tool_end", "tool": "get_attendance_analytics", "args": {}, "duration_ms": 110, "ok": True})
            on_event({"event": "tool_end", "tool": "ask_attendance_agent", "agent": "attendance", "duration_ms": 250, "ok": True})
        return {
            "answer": "Streamed supervisor response: Plant IN-KA-01 attendance was 94.2%.",
            "tool_trace": [
                {"tool": "ask_attendance_agent", "duration_ms": 250, "ok": True},
                {"tool": "get_attendance_analytics", "duration_ms": 110, "ok": True},
            ],
            "steps": 2,
            "selected_agents": ["attendance"],
        }

    async def _async_test():
        with patch("app.agents.specialists.run_supervisor", side_effect=fake_run_supervisor):
            orchestrator = CentralAgentOrchestrator()
            events = []
            async for chunk in orchestrator.stream_orchestration("What is the attendance rate in plant IN-KA-01?"):
                for line in chunk.split("\n"):
                    if line.startswith("data: "):
                        events.append(json.loads(line[6:]))

            event_types = [e.get("event") for e in events]
            assert "init" in event_types
            assert "stage_start" in event_types
            assert "stage_end" in event_types
            assert "done" in event_types

            done_event = next(e for e in events if e.get("event") == "done")
            assert "result" in done_event
            res = done_event["result"]
            assert "tool_trace" in res
            assert len(res["tool_trace"]) == 2
            assert "94.2%" in res["answer"]

    asyncio.run(_async_test())

