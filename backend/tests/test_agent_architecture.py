"""Focused unit tests for LangChain Workforce Agent Architecture (Phase 6.1)."""

import os
from unittest.mock import patch

import pytest
from langchain_core.language_models.chat_models import SimpleChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.tools import tool

from app.agents import (
    ConversationMemoryManager,
    LLMProviderNotConfiguredError,
    WORKFORCE_SYSTEM_PROMPT,
    WorkforceAgentService,
    WorkforceToolRegistry,
    agent_service,
    conversation_memory,
    get_chat_model,
    get_workforce_prompt_template,
    is_llm_configured,
    register_llm_provider,
    sample_health_tool,
    tool_registry,
)
from app.agents.llm.provider import clear_provider_registry


class MockChatModel(SimpleChatModel):
    """Deterministic mock chat model for unit testing without live external APIs."""

    response_text: str = "Mock agent answer."

    @property
    def _llm_type(self) -> str:
        return "mock"

    def _call(self, messages: list[BaseMessage], **kwargs) -> str:
        return self.response_text


def test_agent_module_imports():
    """Verify that all core agent architecture modules and symbols import cleanly."""
    import app.agents as agents
    from app.agents.agent_service import WorkforceAgentService
    from app.agents.llm.provider import LLMProviderNotConfiguredError, get_chat_model
    from app.agents.memory.conversation_memory import ConversationMemoryManager
    from app.agents.prompts.workforce_prompt import get_workforce_prompt_template
    from app.agents.tools.workforce_tools import WorkforceToolRegistry

    assert agents.agent_service is not None
    assert agents.conversation_memory is not None
    assert agents.tool_registry is not None


def test_provider_configuration_unconfigured_raises_error():
    """Verify get_chat_model raises LLMProviderNotConfiguredError when LLM_PROVIDER is unset."""
    clear_provider_registry()
    with patch.dict(os.environ, {"LLM_PROVIDER": ""}, clear=False):
        assert not is_llm_configured()
        with pytest.raises(LLMProviderNotConfiguredError) as exc_info:
            get_chat_model()
        assert "No LLM provider is configured" in str(exc_info.value)


def test_missing_llm_configuration_agent_service_handling():
    """Verify agent_service.execute_query raises LLMProviderNotConfiguredError when unconfigured."""
    clear_provider_registry()
    with patch.dict(os.environ, {"LLM_PROVIDER": ""}, clear=False):
        service = WorkforceAgentService()
        with pytest.raises(LLMProviderNotConfiguredError):
            service.execute_query("What is the workforce attendance rate?")


def test_provider_registration_and_execution():
    """Verify registering an LLM provider enables the agent runnable to execute cleanly."""
    clear_provider_registry()
    register_llm_provider("test_mock", lambda: MockChatModel(response_text="Shift A has 60 employees."))

    with patch.dict(os.environ, {"LLM_PROVIDER": "test_mock"}, clear=False):
        assert is_llm_configured()
        chat_model = get_chat_model()
        assert isinstance(chat_model, MockChatModel)

        memory = ConversationMemoryManager()
        service = WorkforceAgentService(memory=memory)

        result = service.execute_query("How many workers are in Shift A?", conversation_id="conv-test-1")
        assert result["status"] == "success"
        assert result["conversation_id"] == "conv-test-1"
        assert result["response"] == "Shift A has 60 employees."

        # Verify message stored in memory
        msgs = memory.get_messages("conv-test-1")
        assert len(msgs) == 2
        assert msgs[0].content == "How many workers are in Shift A?"
        assert msgs[1].content == "Shift A has 60 employees."

    clear_provider_registry()


def test_conversation_isolation():
    """Verify conversation memory maintains strict boundary between different conversation IDs."""
    memory = ConversationMemoryManager()

    # User 1 conversation
    memory.add_user_message("user-session-1", "Query from session 1")
    memory.add_ai_message("user-session-1", "Answer to session 1")

    # User 2 conversation
    memory.add_user_message("user-session-2", "Query from session 2")
    memory.add_ai_message("user-session-2", "Answer to session 2")

    # Verify session 1 messages
    s1_msgs = memory.get_messages("user-session-1")
    assert len(s1_msgs) == 2
    assert s1_msgs[0].content == "Query from session 1"
    assert s1_msgs[1].content == "Answer to session 1"

    # Verify session 2 messages
    s2_msgs = memory.get_messages("user-session-2")
    assert len(s2_msgs) == 2
    assert s2_msgs[0].content == "Query from session 2"
    assert s2_msgs[1].content == "Answer to session 2"

    # Verify clear operates only on specified conversation
    memory.clear_history("user-session-1")
    assert len(memory.get_messages("user-session-1")) == 0
    assert len(memory.get_messages("user-session-2")) == 2


def test_null_conversation_id_generates_new_uuid():
    """Verify get_or_create_conversation_id generates unique UUIDs for null/empty values."""
    memory = ConversationMemoryManager()
    id1 = memory.get_or_create_conversation_id(None)
    id2 = memory.get_or_create_conversation_id("")
    id3 = memory.get_or_create_conversation_id("   ")
    id4 = memory.get_or_create_conversation_id("custom-id-123")

    assert isinstance(id1, str) and len(id1) >= 32
    assert isinstance(id2, str) and len(id2) >= 32
    assert id1 != id2
    assert id4 == "custom-id-123"


def test_tool_registration_structure():
    """Verify tool registry supports registering, retrieving, and unregistering tools."""
    registry = WorkforceToolRegistry()
    assert len(registry.get_registered_tools()) == 0

    @tool
    def test_custom_tool(arg: str) -> str:
        """A test tool."""
        return f"result: {arg}"

    registry.register_tool(test_custom_tool)
    assert "test_custom_tool" in registry.get_tool_names()
    assert registry.get_tool("test_custom_tool") is not None
    assert len(registry.get_registered_tools()) == 1

    registry.unregister_tool("test_custom_tool")
    assert len(registry.get_registered_tools()) == 0


def test_workforce_system_prompt_rules():
    """Verify system prompt contains all required operational rules and status constraints."""
    prompt_str = WORKFORCE_SYSTEM_PROMPT

    # 1. Status preservation
    assert "PRESENT" in prompt_str
    assert "ABSENT" in prompt_str
    assert "LEAVE" in prompt_str
    assert "LATE" in prompt_str
    assert "NEVER classify LEAVE or LATE as ABSENT" in prompt_str

    # 2. Formula definitions
    assert "PRESENT records / eligible attendance records" in prompt_str
    assert "ABSENT records / eligible attendance records" in prompt_str

    # 3. Tool grounding
    assert "Always query registered workforce tools" in prompt_str
    assert "NEVER hallucinate, extrapolate, or invent" in prompt_str

    # 4. Prompt template structure
    tmpl = get_workforce_prompt_template()
    assert tmpl is not None
    assert "chat_history" in tmpl.input_variables
    assert "input" in tmpl.input_variables
