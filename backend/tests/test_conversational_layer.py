"""Unit and regression tests for Central Workforce Assistant Conversational LLM Layer."""

import asyncio
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agents.central_agent_orchestrator import central_agent_orchestrator


class MockChatModel:
    """Mock LangChain chat model for testing conversational LLM responses."""

    def __init__(self, response_text: str = "Here is a natural summary of workforce findings. I recommend capping overtime."):
        self.response_text = response_text
        self.invoked_with = []

    def invoke(self, messages, **kwargs):
        self.invoked_with.append(messages)
        return AIMessage(content=self.response_text)


def test_conversational_layer_llm_mocked():
    """Test (a): When LLM is configured and mocked:
    - payload['conversational_answer'] is populated with the conversational text
    - payload['answer'] is conversational_text + '\n\n' + structured markdown
    - structured parts (tables, metrics, evidence) are fully preserved.
    """
    mock_llm_text = (
        "Good morning! Overtime across our production facilities reached 58,433 hours this period, "
        "with Plant 1 accounting for the largest share. "
        "I recommend capping weekly contractor overtime at 16 hours in Plant 1."
    )
    mock_model = MockChatModel(response_text=mock_llm_text)

    with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True), \
         patch("app.agents.central_agent_orchestrator.get_chat_model", return_value=mock_model):

        conv_id = "test-conv-llm-mocked-01"
        res = central_agent_orchestrator.execute_query(
            "Which plant has the highest overtime?",
            conversation_id=conv_id,
        )

        # 1. conversational_answer is set to LLM text
        assert "conversational_answer" in res
        assert res["conversational_answer"] == mock_llm_text

        # 2. answer contains conversational text + "\n\n" + structured markdown
        assert res["answer"].startswith(mock_llm_text + "\n\n")
        assert "### Direct Answer: Plant Overtime Ranking" in res["answer"]
        assert "Facility Overtime Breakdown" in res["answer"]
        assert "| Rank | Facility Name |" in res["answer"]

        # 3. Structured data keys preserved
        assert len(res["key_metrics"]) >= 2
        assert len(res["recommendations"]) >= 1
        assert "Plant 1" in res["direct_answer"] or "IN-TN-01" in res["direct_answer"]

        # 4. Verify system prompt and facts passed to LLM
        assert len(mock_model.invoked_with) > 0
        last_messages = mock_model.invoked_with[-1]
        system_msg = last_messages[0].content
        user_msg = last_messages[1].content
        assert "friendly workforce operations assistant" in system_msg
        assert "FACTS:" in user_msg
        assert "direct_answer" in user_msg


def test_conversational_layer_llm_unconfigured():
    """Test (b): When LLM is unconfigured:
    - payload['conversational_answer'] is not present
    - payload['answer'] is identical to the structured markdown output
    - zero alteration to analytical facts.
    """
    with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=False):
        conv_id = "test-conv-llm-unconfigured-01"
        res = central_agent_orchestrator.execute_query(
            "Which plant has the highest overtime?",
            conversation_id=conv_id,
        )

        # 1. conversational_answer is None or omitted
        assert res.get("conversational_answer") is None

        # 2. answer is strictly the structured markdown directly
        assert res["answer"].startswith("### Direct Answer: Plant Overtime Ranking")
        assert "Facility Overtime Breakdown" in res["answer"]
        assert "| Rank | Facility Name |" in res["answer"]

        # 3. Key metrics and recommendations remain identical
        assert any("Chennai" in m.get("value", "") or "Plant 1" in m.get("label", "") for m in res["key_metrics"])


def test_unrecognized_intent_llm_mocked():
    """Test (a-2): For unrecognized intent (or greeting/small talk) with LLM mocked:
    - Canned guide text is replaced with conversational greeting/steering.
    """
    mock_greeting = "Hello! I am your Workforce Assistant. I can help you analyze employee rankings, attendance, overtime, and skills."
    mock_model = MockChatModel(response_text=mock_greeting)

    with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True), \
         patch("app.agents.central_agent_orchestrator.get_chat_model", return_value=mock_model):

        res = central_agent_orchestrator.execute_query("Hello there, good morning!")
        assert res["answer"] == mock_greeting
        assert res["status"] == "success"


def test_unrecognized_intent_llm_unconfigured():
    """Test (b-2): For unrecognized intent when LLM is unconfigured:
    - Falls back to the canonical canned guide text.
    """
    with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=False):
        res = central_agent_orchestrator.execute_query("Hello there, good morning!")
        assert "### Central Workforce Intelligence Assistant" in res["answer"]
        assert "7 operational domains" in res["answer"]
        assert "1. **Employee Performance Rankings**" in res["answer"]


def test_build_unified_response_removes_invented_defaults():
    """Requirement 4: Verify invented defaults (92.5, 5.8, 177,665, 'SMT Production 5.8%')
    are removed. Missing metrics must be skipped without inventing values.
    """
    classification = {
        "selected_agents": ["attendance"],
        "intent_name": "Attendance Analysis",
    }
    # Empty metrics result with no attendance numbers
    agent_results = {
        "attendance": {
            "status": "SUCCESS",
            "metrics": {},
            "findings": [],
            "recommendations": [],
        }
    }

    res = central_agent_orchestrator._build_unified_response(
        user_query="Check attendance",
        classification=classification,
        agent_results=agent_results,
        filters={},
    )

    # Must NOT contain hardcoded invented values
    assert not any("92.5" in str(m.get("value")) for m in res["key_metrics"])
    assert not any("5.8" in str(m.get("value")) for m in res["key_metrics"])
    assert not any("177,665" in str(e.get("value")) for e in res["evidence"])
    assert "SMT Production records the highest absenteeism hotspot at 5.8%" not in res["direct_answer"]
    assert "92.5%" not in res["answer"]


def test_stream_orchestration_stage_5_conversational_layer():
    """Verify stream_orchestration Stage 5 genuinely calls conversational layer when LLM configured."""
    mock_llm_text = "Here is the real-time synthesized conversational insight from Stage 5."
    mock_model = MockChatModel(response_text=mock_llm_text)

    async def _run_stream():
        events = []
        with patch("app.agents.central_agent_orchestrator.is_llm_configured", return_value=True), \
             patch("app.agents.central_agent_orchestrator.get_chat_model", return_value=mock_model):

            gen = central_agent_orchestrator.stream_orchestration(
                user_query="Which plant has the highest overtime?",
                conversation_id="test-stream-llm-01",
            )
            async for chunk in gen:
                events.append(chunk)
        return events

    events = asyncio.run(_run_stream())
    events_text = "".join(events)

    # Verify stage 5 ran and completed
    assert '"stage_id": 5' in events_text
    assert '"status": "completed"' in events_text

    # Verify done event contains conversational answer
    assert "conversational_answer" in events_text
    assert "real-time synthesized conversational insight from Stage 5" in events_text
