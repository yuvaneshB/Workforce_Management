"""Unit tests for agent runner and Domo strict tool mode."""

from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool

from app.agents.llm.domo_provider import DomoChatModel
from app.agents.runtime.agent_runner import run_tool_agent


class FakeScriptedChatModel(BaseChatModel):
    """Fake chat model returning a scripted sequence of AIMessages for deterministic testing."""

    responses: list[AIMessage]
    current_index: int = 0
    invocations: list[list[BaseMessage]] = []

    def __init__(self, responses: list[AIMessage], **kwargs: Any):
        super().__init__(responses=responses, current_index=0, invocations=[], **kwargs)

    @property
    def _llm_type(self) -> str:
        return "fake_scripted"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        self.invocations.append(list(messages))
        if self.current_index < len(self.responses):
            resp = self.responses[self.current_index]
            self.current_index += 1
            return ChatResult(generations=[ChatGeneration(message=resp)])
        # Fallback if exhausted
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="Final default response."))])

    def bind_tools(self, tools: list[Any], **kwargs: Any) -> "FakeScriptedChatModel":
        return self


# Sample tools for testing
@tool
def tool_a_lookup(query_val: str) -> dict[str, Any]:
    """Lookup tool A."""
    return {"status": "ok", "result": f"lookup_{query_val}"}


@tool
def tool_b_compute(number: int) -> dict[str, Any]:
    """Compute tool B."""
    return {"status": "ok", "value": number * 2}


@tool
def failing_tool(param: str) -> str:
    """Tool that fails with an exception."""
    raise ValueError(f"Database error on param '{param}'")


def test_multi_step_tool_execution():
    """Verify multi-step workflow: Tool A -> Tool B -> Final Answer."""
    events: list[dict[str, Any]] = []

    responses = [
        # Turn 1: Call Tool A
        AIMessage(
            content="",
            tool_calls=[{"name": "tool_a_lookup", "args": {"query_val": "assembly"}, "id": "call_1"}],
        ),
        # Turn 2: Call Tool B
        AIMessage(
            content="",
            tool_calls=[{"name": "tool_b_compute", "args": {"number": 25}, "id": "call_2"}],
        ),
        # Turn 3: Final Answer
        AIMessage(
            content="Final answer: Assembly has computed value 50.",
            tool_calls=[],
        ),
    ]

    fake_model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="You are a workforce intelligence agent.",
        tools=[tool_a_lookup, tool_b_compute],
        history=[],
        user_input="Analyze assembly metrics.",
        max_steps=6,
        on_event=lambda ev: events.append(ev),
        model=fake_model,
    )

    assert result["answer"] == "Final answer: Assembly has computed value 50."
    assert result["steps"] == 3
    assert len(result["tool_trace"]) == 2

    # Check Tool A trace
    t_a = result["tool_trace"][0]
    assert t_a["tool"] == "tool_a_lookup"
    assert t_a["args"] == {"query_val": "assembly"}
    assert t_a["ok"] is True
    assert t_a["duration_ms"] >= 0

    # Check Tool B trace
    t_b = result["tool_trace"][1]
    assert t_b["tool"] == "tool_b_compute"
    assert t_b["args"] == {"number": 25}
    assert t_b["ok"] is True

    # Check lifecycle events
    start_events = [e for e in events if e.get("event") == "tool_start"]
    end_events = [e for e in events if e.get("event") == "tool_end"]
    assert len(start_events) == 2
    assert len(end_events) == 2
    assert start_events[0]["tool"] == "tool_a_lookup"
    assert start_events[1]["tool"] == "tool_b_compute"
    assert end_events[0]["ok"] is True
    assert end_events[1]["ok"] is True


def test_tool_exception_handling():
    """Verify tool exceptions are caught, recorded as ok=False, and fed back as ToolMessage."""
    events: list[dict[str, Any]] = []

    responses = [
        # Turn 1: Call failing tool
        AIMessage(
            content="",
            tool_calls=[{"name": "failing_tool", "args": {"param": "crash_test"}, "id": "call_fail"}],
        ),
        # Turn 2: Model receives ToolMessage with error and explains gracefully
        AIMessage(
            content="Sorry, the data service failed with: Database error on param 'crash_test'.",
            tool_calls=[],
        ),
    ]

    fake_model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="You are a test agent.",
        tools=[failing_tool],
        history=[],
        user_input="Run the failing query.",
        max_steps=4,
        on_event=lambda ev: events.append(ev),
        model=fake_model,
    )

    # Runner should NOT crash
    assert result["steps"] == 2
    assert "Database error on param 'crash_test'" in result["answer"]
    assert len(result["tool_trace"]) == 1

    trace_entry = result["tool_trace"][0]
    assert trace_entry["tool"] == "failing_tool"
    assert trace_entry["ok"] is False

    # Event verify
    end_ev = [e for e in events if e.get("event") == "tool_end"][0]
    assert end_ev["ok"] is False
    assert "ValueError" in end_ev["result"]


def test_invalid_json_retry_domo_strict_mode():
    """Verify strict_tool_mode retries once on invalid JSON and recovers on valid JSON."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
        strict_tool_mode=True,
    )

    api_call_count = 0

    def fake_post(*args: Any, **kwargs: Any):
        nonlocal api_call_count
        api_call_count += 1
        if api_call_count == 1:
            # First attempt: Invalid plain text without JSON
            return MagicMock(status_code=200, json=lambda: {"output": "I am thinking about your request."})
        # Second attempt (retry): Valid JSON
        return MagicMock(
            status_code=200,
            json=lambda: {"output": '{"final": "Recovered successfully via retry."}'},
        )

    with patch("httpx.Client.post", side_effect=fake_post):
        messages = [HumanMessage(content="What is total headcount?")]
        res = model.invoke(messages)

        assert api_call_count == 2
        assert isinstance(res, AIMessage)
        assert res.content == "Recovered successfully via retry."
        assert len(res.tool_calls) == 0


def test_invalid_json_retry_with_tool_calls():
    """Verify strict_tool_mode retry can successfully return tool_calls."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
        strict_tool_mode=True,
        bound_tools=[tool_a_lookup],
    )

    call_seq = [
        # Call 1: Malformed output
        MagicMock(status_code=200, json=lambda: {"output": "Random conversational text"}),
        # Call 2: Proper tool_calls JSON
        MagicMock(
            status_code=200,
            json=lambda: {
                "output": '{"tool_calls": [{"tool": "tool_a_lookup", "args": {"query_val": "dept_1"}}]}'
            },
        ),
    ]

    with patch("httpx.Client.post", side_effect=call_seq):
        messages = [HumanMessage(content="Query tool A")]
        res = model.invoke(messages)

        assert isinstance(res, AIMessage)
        assert len(res.tool_calls) == 1
        assert res.tool_calls[0]["name"] == "tool_a_lookup"
        assert res.tool_calls[0]["args"] == {"query_val": "dept_1"}


def test_invalid_json_retry_exhausted_fallback():
    """Verify strict_tool_mode handles exhausted retries gracefully without raising unhandled errors."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
        strict_tool_mode=True,
    )

    call_seq = [
        MagicMock(status_code=200, json=lambda: {"output": "Attempt 1 invalid"}),
        MagicMock(status_code=200, json=lambda: {"output": "Attempt 2 also invalid"}),
    ]

    with patch("httpx.Client.post", side_effect=call_seq):
        messages = [HumanMessage(content="Query")]
        res = model.invoke(messages)

        assert isinstance(res, AIMessage)
        assert "Attempt 2 also invalid" in res.content
        assert len(res.tool_calls) == 0


def test_max_steps_stop():
    """Verify agent runner terminates at max_steps when model continues requesting tools."""
    # Endless tool requester
    endless_responses = [
        AIMessage(
            content="",
            tool_calls=[{"name": "tool_a_lookup", "args": {"query_val": f"step_{i}"}, "id": f"call_{i}"}],
        )
        for i in range(10)
    ]
    # Forced final answer response
    endless_responses[3] = AIMessage(
        content="Forced final answer after reaching max_steps.",
        tool_calls=[],
    )

    fake_model = FakeScriptedChatModel(responses=endless_responses)

    result = run_tool_agent(
        system_prompt="Infinite loop test agent.",
        tools=[tool_a_lookup],
        history=[],
        user_input="Run forever.",
        max_steps=3,
        model=fake_model,
    )

    assert result["steps"] == 3
    assert len(result["tool_trace"]) == 3
    assert "Forced final answer" in result["answer"]


def test_strict_tool_mode_disables_keyword_fallback():
    """Verify strict_tool_mode does not invoke legacy keyword-based fallback mapping."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
        strict_tool_mode=True,
        bound_tools=[tool_a_lookup],
    )

    # Output text mentions replacement and employee ID, which in legacy mode triggers keyword fallback
    fake_res = MagicMock(
        status_code=200,
        json=lambda: {"output": '{"final": "In strict mode, direct answer is returned without regex fallback."}'},
    )

    with patch("httpx.Client.post", return_value=fake_res):
        messages = [HumanMessage(content="Who can replace EMP-0018 on 2026-08-01?")]
        res = model.invoke(messages)

        # In strict mode, it does NOT trigger keyword fallback to recommend_replacement_employees
        assert len(res.tool_calls) == 0
        assert "direct answer is returned" in res.content


def test_multi_tool_calls_in_single_turn():
    """Verify runner handles multiple tool calls returned in the same turn."""
    responses = [
        AIMessage(
            content="",
            tool_calls=[
                {"name": "tool_a_lookup", "args": {"query_val": "dept_1"}, "id": "call_1"},
                {"name": "tool_b_compute", "args": {"number": 10}, "id": "call_2"},
            ],
        ),
        AIMessage(
            content="Both tools executed successfully.",
            tool_calls=[],
        ),
    ]

    fake_model = FakeScriptedChatModel(responses=responses)

    result = run_tool_agent(
        system_prompt="Dual tool test.",
        tools=[tool_a_lookup, tool_b_compute],
        user_input="Run both tools.",
        max_steps=3,
        model=fake_model,
    )

    assert result["steps"] == 2
    assert len(result["tool_trace"]) == 2
    assert result["tool_trace"][0]["tool"] == "tool_a_lookup"
    assert result["tool_trace"][1]["tool"] == "tool_b_compute"
    assert result["answer"] == "Both tools executed successfully."

