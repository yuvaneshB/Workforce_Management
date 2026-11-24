"""Test streaming for conversational/greeting questions."""

import asyncio
import json
import pytest
from app.agents.central_agent_orchestrator import CentralAgentOrchestrator


def test_stream_hi_ends_with_done():
    """Verify that streaming 'Hi' ends with a 'done' event, not 'error'."""
    async def _run():
        orchestrator = CentralAgentOrchestrator()
        events = []
        async for chunk in orchestrator.stream_orchestration("Hi"):
            for line in chunk.split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        event_types = [e.get("event") for e in events]
        assert "error" not in event_types, f"Streaming 'Hi' encountered error event: {events}"
        assert "done" in event_types, f"Expected 'done' in event types: {event_types}"
        assert event_types[-1] == "done", f"Last event was '{event_types[-1]}' instead of 'done'"

        done_event = events[-1]
        assert done_event.get("status") == "completed"
        assert done_event.get("result", {}).get("answer") is not None

    asyncio.run(_run())

