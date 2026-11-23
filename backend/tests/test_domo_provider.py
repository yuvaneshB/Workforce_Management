"""Focused unit tests for Domo AI Services Integration (Phase 7)."""

import os
from unittest.mock import MagicMock, patch

import httpx
import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from app.agents.llm.domo_provider import (
    DEFAULT_DOMO_MODEL,
    DomoChatModel,
    _extract_json_tool_call,
    create_domo_chat_model,
)
from app.agents.llm.provider import (
    LLMProviderNotConfiguredError,
    clear_provider_registry,
    get_chat_model,
    is_llm_configured,
)


@pytest.fixture(autouse=True)
def clean_env():
    """Ensure provider registry is clean for each test."""
    clear_provider_registry()
    yield
    clear_provider_registry()


def test_create_domo_chat_model_missing_config():
    """Verify create_domo_chat_model raises error when required env vars are missing."""
    with patch.dict(os.environ, {"DOMO_BASE_URL": "", "DOMO_DEVELOPER_TOKEN": ""}, clear=False):
        with pytest.raises(LLMProviderNotConfiguredError) as exc:
            create_domo_chat_model()
        assert "DOMO_BASE_URL is not set" in str(exc.value)

    with patch.dict(os.environ, {"DOMO_BASE_URL": "https://test.domo.com", "DOMO_DEVELOPER_TOKEN": ""}, clear=False):
        with pytest.raises(LLMProviderNotConfiguredError) as exc:
            create_domo_chat_model()
        assert "DOMO_DEVELOPER_TOKEN is not set" in str(exc.value)


def test_create_domo_chat_model_success():
    """Verify create_domo_chat_model instantiates model with env vars."""
    env_vars = {
        "DOMO_BASE_URL": "https://company.domo.com",
        "DOMO_DEVELOPER_TOKEN": "secret-token-12345",
        "MODEL_NAME": "custom-domo-model",
        "DOMO_TIMEOUT": "45.0",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        model = create_domo_chat_model()
        assert isinstance(model, DomoChatModel)
        assert model.base_url == "https://company.domo.com"
        assert model.developer_token == "secret-token-12345"
        assert model.model_name == "custom-domo-model"
        assert model.timeout == 45.0
        assert model._llm_type == "domo_ai_services"


def test_provider_registration_and_retrieval():
    """Verify LLM provider registry resolves 'domo' to create_domo_chat_model."""
    env_vars = {
        "LLM_PROVIDER": "domo",
        "DOMO_BASE_URL": "https://company.domo.com",
        "DOMO_DEVELOPER_TOKEN": "secret-token-12345",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        assert is_llm_configured()
        chat_model = get_chat_model()
        assert isinstance(chat_model, DomoChatModel)
        assert chat_model.base_url == "https://company.domo.com"


def test_extract_json_tool_call_formats():
    """Verify extraction of tool call JSON across raw, markdown, and embedded formats."""
    # Raw JSON
    raw = '{"tool": "get_department_analytics", "args": {"shift_id": "A"}}'
    assert _extract_json_tool_call(raw) == {"tool": "get_department_analytics", "args": {"shift_id": "A"}}

    # Markdown fenced code block
    fenced = '```json\n{"tool": "get_workforce_summary", "args": {}}\n```'
    assert _extract_json_tool_call(fenced) == {"tool": "get_workforce_summary", "args": {}}

    # Embedded in explanatory text
    embedded = 'I will query the database: {"tool": "get_shift_analytics", "args": {}}.'
    assert _extract_json_tool_call(embedded) == {"tool": "get_shift_analytics", "args": {}}

    # Plain text without tool JSON
    plain = "Hello! How can I help you today with workforce analytics?"
    assert _extract_json_tool_call(plain) is None

    # Empty string
    assert _extract_json_tool_call("") is None


def test_domo_tool_binding():
    """Verify bind_tools attaches tools to a new DomoChatModel instance."""
    @tool
    def sample_tool(param: str) -> str:
        """Sample tool."""
        return param

    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
    )
    assert len(model.bound_tools) == 0

    bound = model.bind_tools([sample_tool])
    assert len(bound.bound_tools) == 1
    assert bound.bound_tools[0].name == "sample_tool"
    assert bound.base_url == "https://test.domo.com"


def test_domo_first_turn_tool_call_generation():
    """Verify first turn generates AIMessage with tool_calls when model returns tool JSON."""
    @tool
    def get_department_analytics(shift_id: str | None = None) -> dict:
        """Get dept analytics."""
        return {}

    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
        bound_tools=[get_department_analytics],
    )

    fake_response = MagicMock(
        status_code=200,
        json=lambda: {"output": '{"tool": "get_department_analytics", "args": {"shift_id": "A"}}'},
    )

    with patch("httpx.Client.post", return_value=fake_response):
        messages = [
            SystemMessage(content="You are workforce assistant."),
            HumanMessage(content="Show department breakdown for shift A."),
        ]
        res = model.invoke(messages)

        assert isinstance(res, AIMessage)
        assert len(res.tool_calls) == 1
        tc = res.tool_calls[0]
        assert tc["name"] == "get_department_analytics"
        assert tc["args"] == {"shift_id": "A"}


def test_domo_second_turn_synthesis():
    """Verify second turn with ToolMessage formats synthesis prompt and returns final text."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
    )

    fake_response = MagicMock(
        status_code=200,
        json=lambda: {
            "output": "Based on verified Neon data, Assembly has the highest headcount of 54 employees."
        },
    )

    with patch("httpx.Client.post", return_value=fake_response) as mock_post:
        messages = [
            SystemMessage(content="System prompt."),
            HumanMessage(content="Which department has highest headcount?"),
            AIMessage(content="", tool_calls=[{"name": "get_department_analytics", "args": {}, "id": "call_1"}]),
            ToolMessage(
                content='{"status": "success", "departments": [{"name": "Assembly", "headcount": 54}]}',
                tool_call_id="call_1",
                name="get_department_analytics",
            ),
        ]
        res = model.invoke(messages)

        assert isinstance(res, AIMessage)
        assert "Assembly has the highest headcount" in res.content
        assert len(res.tool_calls) == 0

        # Verify prompt contained tool facts
        call_kwargs = mock_post.call_args[1]
        sent_input = call_kwargs["json"]["input"]
        assert "Verified Database Facts" in sent_input
        assert "Assembly" in sent_input


def test_domo_api_timeout_handling():
    """Verify timeout exception is converted to clean RuntimeError."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
    )

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Read timed out")):
        with pytest.raises(RuntimeError) as exc:
            model.invoke([HumanMessage(content="Hello")])
        assert "timed out" in str(exc.value)


def test_domo_api_auth_error_sanitization():
    """Verify 401/403 errors are caught without leaking secrets."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="SUPER_SECRET_TOKEN_DO_NOT_LEAK",
        model_name="test-model",
    )

    fake_res = MagicMock(status_code=401, text="Unauthorized")
    with patch("httpx.Client.post", return_value=fake_res):
        with pytest.raises(RuntimeError) as exc:
            model.invoke([HumanMessage(content="Hello")])
        error_msg = str(exc.value)
        assert "authentication failed" in error_msg.lower()
        # Verify secret token is NOT leaked in error
        assert "SUPER_SECRET_TOKEN" not in error_msg


def test_domo_api_rate_limit_handling():
    """Verify 429 rate limit is reported cleanly."""
    model = DomoChatModel(
        base_url="https://test.domo.com",
        developer_token="token",
        model_name="test-model",
    )

    fake_res = MagicMock(status_code=429, text="Too Many Requests")
    with patch("httpx.Client.post", return_value=fake_res):
        with pytest.raises(RuntimeError) as exc:
            model.invoke([HumanMessage(content="Hello")])
        assert "rate limit exceeded" in str(exc.value).lower()

