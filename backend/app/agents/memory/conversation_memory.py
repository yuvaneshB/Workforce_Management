"""Isolated conversation memory management for Workforce Management Agent."""

import uuid
from typing import Any

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage


class IsolatedChatMessageHistory(BaseChatMessageHistory):
    """In-memory message history container for an isolated conversation session."""

    def __init__(self) -> None:
        self.messages: list[BaseMessage] = []

    def add_message(self, message: BaseMessage) -> None:
        """Append a message to this session's history."""
        self.messages.append(message)

    def clear(self) -> None:
        """Clear all messages from this session's history."""
        self.messages = []


class ConversationMemoryManager:
    """Manages isolated conversation histories keyed strictly by conversation_id.

    Ensures that conversation histories are never cross-pollinated or shared.
    Operates in-memory without requiring additional database tables in Phase 6.1.
    """

    def __init__(self, max_messages_per_conversation: int = 50) -> None:
        self._stores: dict[str, IsolatedChatMessageHistory] = {}
        self._contexts: dict[str, dict[str, Any]] = {}
        self.max_messages = max_messages_per_conversation

    def get_or_create_conversation_id(self, conversation_id: str | None = None) -> str:
        """Return existing conversation_id or generate a new unique UUID4 string."""
        if conversation_id and conversation_id.strip():
            return conversation_id.strip()
        return str(uuid.uuid4())

    def get_history(self, conversation_id: str) -> BaseChatMessageHistory:
        """Retrieve isolated message history for the specified conversation ID."""
        conv_id = conversation_id.strip()
        if conv_id not in self._stores:
            self._stores[conv_id] = IsolatedChatMessageHistory()
        return self._stores[conv_id]

    def add_user_message(self, conversation_id: str, message: str) -> None:
        """Add a human query to the conversation history, adhering to length limits."""
        history = self.get_history(conversation_id)
        history.add_message(HumanMessage(content=message))
        self._prune_history(conversation_id)

    def add_ai_message(self, conversation_id: str, message: str) -> None:
        """Add an agent response to the conversation history, adhering to length limits."""
        history = self.get_history(conversation_id)
        history.add_message(AIMessage(content=message))
        self._prune_history(conversation_id)

    def get_messages(self, conversation_id: str) -> list[BaseMessage]:
        """Return the current list of messages for a given conversation."""
        return self.get_history(conversation_id).messages

    def get_context(self, conversation_id: str) -> dict[str, Any]:
        """Retrieve session context (last agent, filters) for follow-up resolution."""
        conv_id = conversation_id.strip()
        return self._contexts.get(conv_id, {})

    def set_context(self, conversation_id: str, context: dict[str, Any]) -> None:
        """Update session context for a conversation ID."""
        conv_id = conversation_id.strip()
        if conv_id not in self._contexts:
            self._contexts[conv_id] = {}
        self._contexts[conv_id].update(context)

    def clear_history(self, conversation_id: str) -> None:
        """Erase all messages and context for a specific conversation ID."""
        conv_id = conversation_id.strip()
        if conv_id in self._stores:
            self._stores[conv_id].clear()
            del self._stores[conv_id]
        if conv_id in self._contexts:
            del self._contexts[conv_id]

    def clear_all(self) -> None:
        """Erase all active conversation stores and contexts (primarily for testing)."""
        self._stores.clear()
        self._contexts.clear()

    def list_active_conversations(self) -> list[str]:
        """List all active conversation IDs."""
        return list(self._stores.keys())

    def _prune_history(self, conversation_id: str) -> None:
        """Prune oldest non-system messages if max limit is exceeded."""
        store = self._stores.get(conversation_id)
        if store and len(store.messages) > self.max_messages:
            store.messages = store.messages[-self.max_messages:]


# Global singleton instance for conversation memory management
conversation_memory = ConversationMemoryManager()
