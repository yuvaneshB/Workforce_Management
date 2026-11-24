"""Test SSE stream events in tools mode: verified event names, tool progress, and guaranteed done event."""

import asyncio
import json
import os
import sys
from unittest.mock import patch

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from langchain_core.messages import AIMessage
from app.agents.central_agent_orchestrator import CentralAgentOrchestrator
from tests.test_agent_runner import FakeScriptedChatModel


ALLOWED_EVENT_NAMES = {"init", "stage_start", "stage_end", "done", "error"}


def test_stream_events_lifecycle_and_timeout():
    """Verify stream lifecycle events: only existing event names, tool progress, and guaranteed done event."""
    async def _test():
        orchestrator = CentralAgentOrchestrator()

        # Part 1: Normal flow with tool calls
        supervisor_step1 = AIMessage(
            content="",
            tool_calls=[{
                "name": "ask_attendance_agent",
                "args": {"question": "What is the attendance rate?"},
                "id": "call_sup_att_1",
            }],
        )
        supervisor_step2 = AIMessage(content="Attendance rate across plants is 92.2% with 3.9% absenteeism.")
        fake_model = FakeScriptedChatModel(responses=[supervisor_step1, supervisor_step2])

        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.llm.provider.get_chat_model", return_value=fake_model):
                events = []
                async for chunk in orchestrator.stream_orchestration("What is the attendance rate?"):
                    for line in chunk.split("\n"):
                        if line.startswith("data: "):
                            events.append(json.loads(line[6:]))

                # (a) Check event names are only existing ones
                for ev in events:
                    event_name = ev.get("event")
                    assert event_name in ALLOWED_EVENT_NAMES, f"Unexpected event name: {event_name}"

                # (b) "Calling <tool>" or "Asking <agent>" progress events appear
                messages = [e.get("message", "") for e in events if e.get("message")]
                has_progress = any(
                    "Calling " in msg or "Asking " in msg
                    for msg in messages
                )
                assert has_progress, f"Expected 'Calling <tool>' or 'Asking <agent>' in messages: {messages}"

                # (c) "done" is the last event
                assert events[-1]["event"] == "done", f"Last event was {events[-1]['event']}, expected 'done'"
                assert "answer" in events[-1].get("result", {})
                assert "tool_trace" in events[-1].get("result", {})

        # Part 2: Forced timeout -> "done" is still the last event with friendly answer
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True):
            with patch("app.agents.specialists.run_supervisor", side_effect=TimeoutError("Forced timeout")):
                timeout_events = []
                async for chunk in orchestrator.stream_orchestration("Annual attrition rate?"):
                    for line in chunk.split("\n"):
                        if line.startswith("data: "):
                            timeout_events.append(json.loads(line[6:]))

                for ev in timeout_events:
                    assert ev.get("event") in ALLOWED_EVENT_NAMES

                # "done" must be the last event, never unhandled error
                assert timeout_events[-1]["event"] == "done"
                res = timeout_events[-1].get("result", {})
                assert "answer" in res
                assert "unavailable" in res["answer"].lower() or "longer than expected" in res["answer"].lower() or "unable" in res["answer"].lower()

    asyncio.run(_test())
