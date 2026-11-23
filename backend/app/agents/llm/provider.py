"""Replaceable LLM provider configuration for Workforce Management Agent."""

import os
from collections.abc import Callable
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel


class LLMProviderNotConfiguredError(RuntimeError):
    """Raised when an LLM provider is requested but not configured in the environment."""


# Registry for extensible provider factories (e.g. Domo AI Services in Phase 7)
_PROVIDER_REGISTRY: dict[str, Callable[[], BaseChatModel]] = {}


def register_llm_provider(name: str, factory: Callable[[], BaseChatModel]) -> None:
    """Register a custom or external LLM provider factory."""
    _PROVIDER_REGISTRY[name.strip().lower()] = factory


def clear_provider_registry() -> None:
    """Reset the custom provider registry (primarily for testing)."""
    _PROVIDER_REGISTRY.clear()


def is_llm_configured() -> bool:
    """Check whether a valid LLM provider is configured in environment or registry."""
    provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    if not provider:
        return False
    if provider in _PROVIDER_REGISTRY:
        return True
    if provider in {"domo", "domo_ai", "domo_ai_services"}:
        return bool(os.getenv("DOMO_BASE_URL") and os.getenv("DOMO_DEVELOPER_TOKEN"))
    return False


def get_chat_model(**kwargs: Any) -> BaseChatModel:
    """Retrieve the configured BaseChatModel instance.

    Raises:
        LLMProviderNotConfiguredError: If no provider is configured.
            Never returns a fabricated or mock response when unconfigured.
    """
    provider = os.getenv("LLM_PROVIDER", "").strip().lower()

    if not provider:
        raise LLMProviderNotConfiguredError(
            "No LLM provider is configured. Please configure an LLM provider "
            "(such as Domo AI Services in Phase 7) via LLM_PROVIDER in backend/.env "
            "before invoking the workforce agent."
        )

    if provider in _PROVIDER_REGISTRY:
        factory = _PROVIDER_REGISTRY[provider]
        return factory()

    if provider in {"domo", "domo_ai", "domo_ai_services"}:
        from app.agents.llm.domo_provider import create_domo_chat_model

        return create_domo_chat_model(**kwargs)

    raise LLMProviderNotConfiguredError(
        f"Unsupported or unconfigured LLM provider '{provider}'. "
        f"Registered providers: {list(_PROVIDER_REGISTRY.keys()) + ['domo']}. "
        "Set LLM_PROVIDER=domo to use Domo AI Services."
    )

