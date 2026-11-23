"""Focused unit and integration tests for Workforce Agent Orchestration and Chat API (Phase 6.3)."""

import json
import os
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
    get_department_analytics,
    get_workforce_summary,
    tool_registry,
)
from app.main import app


class FakeToolCallingChatModel(BaseChatModel):
    """Deterministic fake chat model simulating tool calling and response synthesis."""

    target_tool: str | None = None
    target_args: dict[str, Any] = {}
    final_answer: str = "Synthesized response based on live tool results."

    @property
    def _llm_type(self) -> str:
        return "fake-tool-caller"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages: list[BaseMessage], stop=None, **kwargs) -> ChatResult:
        has_tool_message = any(isinstance(m, ToolMessage) for m in messages)
        if not has_tool_message and self.target_tool:
            # First turn: Request tool execution
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
            # Second turn or direct response: Synthesize answer
            msg = AIMessage(content=self.final_answer)

        return ChatResult(generations=[ChatGeneration(message=msg)])


@pytest.fixture(autouse=True)
def clean_agent_state():
    """Ensure clean provider registry and memory before and after each test."""
    clear_provider_registry()
    conversation_memory.clear_all()
    yield
    clear_provider_registry()
    conversation_memory.clear_all()


def test_endpoint_registration():
    """Verify POST /api/v1/agent/chat is properly registered in FastAPI routes."""
    client = TestClient(app)

    # GET method returns 405 Method Not Allowed (proving the POST route exists)
    get_res = client.get("/api/v1/agent/chat")
    assert get_res.status_code == 405

    # Check swagger openapi schema contains /api/v1/agent/chat with post operation
    openapi = app.openapi()
    assert "/api/v1/agent/chat" in openapi["paths"]
    assert "post" in openapi["paths"]["/api/v1/agent/chat"]


def test_missing_llm_configuration():
    """Verify endpoint returns clear 503 error when LLM provider is not configured."""
    with patch.dict(os.environ, {"LLM_PROVIDER": ""}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "What is the total workforce count?", "conversation_id": None},
            )

        assert res.status_code == 503
        data = res.json()
        assert data["data_available"] is False
        assert data["tools_used"] == []
        assert data["error"] is not None
        assert "No LLM provider is configured" in data["error"]
        assert len(data["conversation_id"]) >= 32


def test_empty_message_validation():
    """Verify endpoint validates empty messages, whitespace, and length boundaries."""
    with TestClient(app) as client:
        # Empty string
        res1 = client.post("/api/v1/agent/chat", json={"message": "", "conversation_id": None})
        assert res1.status_code == 400
        assert "Message cannot be empty" in res1.json()["detail"]

        # Whitespace-only string
        res2 = client.post("/api/v1/agent/chat", json={"message": "   \n\t  ", "conversation_id": None})
        assert res2.status_code == 400
        assert "Message cannot be empty" in res2.json()["detail"]

        # Missing message field
        res3 = client.post("/api/v1/agent/chat", json={"conversation_id": None})
        assert res3.status_code == 400
        assert "Message cannot be empty" in res3.json()["detail"]

        # Message exceeding max length
        long_message = "A" * 4001
        res4 = client.post("/api/v1/agent/chat", json={"message": long_message})
        assert res4.status_code == 400
        assert "exceeds maximum allowed length" in res4.json()["detail"]


def test_conversation_id_generation_and_reuse():
    """Verify conversation ID is generated when null and preserved on subsequent requests."""
    register_llm_provider("fake_llm", lambda: FakeToolCallingChatModel(final_answer="Hello! How can I help?"))

    with patch.dict(os.environ, {"LLM_PROVIDER": "fake_llm"}, clear=False):
        with TestClient(app) as client:
            # First request without conversation_id
            res1 = client.post("/api/v1/agent/chat", json={"message": "Hello", "conversation_id": None})
            assert res1.status_code == 200
            data1 = res1.json()
            generated_id = data1["conversation_id"]
            assert generated_id is not None
            assert len(generated_id) >= 32
            assert data1["error"] is None

            # Second request reusing generated conversation_id
            res2 = client.post(
                "/api/v1/agent/chat",
                json={"message": "What can you do?", "conversation_id": generated_id},
            )
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["conversation_id"] == generated_id


def test_conversation_isolation():
    """Verify that multiple conversations maintain strictly isolated message histories."""
    register_llm_provider("fake_llm", lambda: FakeToolCallingChatModel(final_answer="Acknowledged."))

    with patch.dict(os.environ, {"LLM_PROVIDER": "fake_llm"}, clear=False):
        with TestClient(app) as client:
            client.post("/api/v1/agent/chat", json={"message": "User A message 1", "conversation_id": "conv-user-a"})
            client.post("/api/v1/agent/chat", json={"message": "User B message 1", "conversation_id": "conv-user-b"})

            history_a = conversation_memory.get_messages("conv-user-a")
            history_b = conversation_memory.get_messages("conv-user-b")

            assert len(history_a) == 2
            assert history_a[0].content == "User A message 1"

            assert len(history_b) == 2
            assert history_b[0].content == "User B message 1"

            # Verify no cross-talk
            assert not any("User B" in m.content for m in history_a)
            assert not any("User A" in m.content for m in history_b)


def test_department_analytics_tool_execution():
    """Verify agent executes get_department_analytics and includes it in tools_used."""
    register_llm_provider(
        "dept_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_department_analytics",
            target_args={},
            final_answer="Department Assembly has the highest absenteeism rate at 12.5%.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "dept_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={
                    "message": "Which department has the highest absenteeism?",
                    "conversation_id": "dept-test-conv",
                },
            )

        assert res.status_code == 200
        data = res.json()
        assert data["conversation_id"] == "dept-test-conv"
        assert "get_department_analytics" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None
        assert "Assembly" in data["answer"]


def test_workforce_summary_tool_execution():
    """Verify agent executes get_workforce_summary and reports tool usage."""
    register_llm_provider(
        "summary_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_workforce_summary",
            target_args={},
            final_answer="There are 180 total active employees across 18 teams.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "summary_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "Give me a workforce summary.", "conversation_id": None},
            )

        assert res.status_code == 200
        data = res.json()
        assert "get_workforce_summary" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None
        assert "180" in data["answer"]


def test_attendance_analytics_tool_execution():
    """Verify agent executes get_attendance_analytics with optional shift filters."""
    register_llm_provider(
        "att_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_attendance_analytics",
            target_args={"shift_id": "A"},
            final_answer="Shift A attendance is 88.4% with 5.2% absenteeism.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "att_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "What is the attendance for Shift A?", "conversation_id": None},
            )

        assert res.status_code == 200
        data = res.json()
        assert "get_attendance_analytics" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None


def test_tool_execution_failure_handling():
    """Verify tool execution failures are caught gracefully without stack traces."""
    register_llm_provider(
        "failing_tool_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_department_analytics",
            target_args={},
            final_answer="I was unable to retrieve department details.",
        ),
    )

    # Mock get_department_analytics to simulate a database failure
    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_department_analytics",
        side_effect=RuntimeError("Database query timed out"),
    ):
        with patch.dict(os.environ, {"LLM_PROVIDER": "failing_tool_llm"}, clear=False):
            with TestClient(app) as client:
                res = client.post(
                    "/api/v1/agent/chat",
                    json={"message": "Show department absenteeism.", "conversation_id": "fail-conv"},
                )

            assert res.status_code == 200
            data = res.json()
            assert "get_department_analytics" in data["tools_used"]
            assert data["data_available"] is False
            assert data["error"] is not None
            assert "Database query timed out" in data["error"]
            # Sensitive stack trace is NOT exposed
            assert "Traceback" not in data["error"]


def test_shift_analytics_tool_execution():
    """Verify agent executes get_shift_analytics and reports tool usage."""
    register_llm_provider(
        "shift_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_shift_analytics",
            target_args={"shift_id": "B"},
            final_answer="Shift B has 60 employees with 91.2% attendance rate.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "shift_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "Show analytics for Shift B.", "conversation_id": None},
            )

        assert res.status_code == 200
        data = res.json()
        assert "get_shift_analytics" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None
        assert "Shift B" in data["answer"]


def test_experience_analytics_tool_execution():
    """Verify agent executes get_experience_analytics and reports tool usage."""
    register_llm_provider(
        "exp_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_experience_analytics",
            target_args={},
            final_answer="The 1-3 Years tier has 45 employees with 94.0% attendance.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "exp_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "What is the experience breakdown?", "conversation_id": None},
            )

        assert res.status_code == 200
        data = res.json()
        assert "get_experience_analytics" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None


def test_section_analytics_tool_execution():
    """Verify agent executes get_section_analytics and reports tool usage."""
    register_llm_provider(
        "sec_llm",
        lambda: FakeToolCallingChatModel(
            target_tool="get_section_analytics",
            target_args={},
            final_answer="Section SMT-01 has 30 workers with 96.5% attendance rate.",
        ),
    )

    with patch.dict(os.environ, {"LLM_PROVIDER": "sec_llm"}, clear=False):
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/agent/chat",
                json={"message": "Show section-wise attendance.", "conversation_id": None},
            )

        assert res.status_code == 200
        data = res.json()
        assert "get_section_analytics" in data["tools_used"]
        assert data["data_available"] is True
        assert data["error"] is None


def test_core_workforce_tools_registered():
    """Verify required core workforce tools are registered."""
    registered = tool_registry.get_tool_names()
    assert len(registered) >= 6
    assert {
        "get_workforce_summary",
        "get_attendance_analytics",
        "get_department_analytics",
        "get_shift_analytics",
        "get_experience_analytics",
        "get_section_analytics",
    }.issubset(set(registered))
