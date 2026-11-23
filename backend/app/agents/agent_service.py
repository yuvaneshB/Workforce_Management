"""Workforce Management Agent orchestration entry point."""

import json
import logging
import uuid
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.runnables import Runnable

from app.agents.llm.provider import LLMProviderNotConfiguredError, get_chat_model
from app.agents.memory.conversation_memory import (
    ConversationMemoryManager,
    conversation_memory,
)
from app.agents.prompts.workforce_prompt import get_workforce_prompt_template
from app.agents.tools.workforce_tools import WorkforceToolRegistry, tool_registry

logger = logging.getLogger(__name__)


class WorkforceAgentService:
    """Orchestrates conversation memory, prompt assembly, tool binding, and LLM execution."""

    def __init__(
        self,
        memory: ConversationMemoryManager | None = None,
        registry: WorkforceToolRegistry | None = None,
    ) -> None:
        self.memory = memory or conversation_memory
        self.tool_registry = registry or tool_registry

    def get_runnable(self) -> Runnable:
        """Construct the LCEL runnable pipeline using the configured chat model and prompt.

        Raises:
            LLMProviderNotConfiguredError: If no LLM provider is configured.
        """
        chat_model = get_chat_model()
        tools = self.tool_registry.get_registered_tools()
        model_with_tools = chat_model
        if tools and hasattr(chat_model, "bind_tools"):
            try:
                model_with_tools = chat_model.bind_tools(tools)
            except (NotImplementedError, AttributeError):
                model_with_tools = chat_model

        prompt = get_workforce_prompt_template()
        return prompt | model_with_tools

    def execute_query(
        self,
        user_query: str,
        conversation_id: str | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Execute a user query against the workforce agent with isolated conversation memory.

        Args:
            user_query: The incoming natural language question from the user.
            conversation_id: Optional ID for continuing an existing conversation.
                             If None or empty, a new unique conversation ID is generated.

        Returns:
            Dict containing:
                - conversation_id: The active conversation identifier.
                - answer: The generated agent text response.
                - response: Kept for backwards compatibility.
                - tools_used: List of tool names called during execution.
                - data_available: Whether data was available from tools.
                - status: "success" or "error".
                - error: Error message if failed, otherwise None.

        Raises:
            LLMProviderNotConfiguredError: If the LLM provider is not configured.
        """
        conv_id = self.memory.get_or_create_conversation_id(conversation_id)
        trimmed_query = user_query.strip() if user_query else ""

        if not trimmed_query:
            return {
                "conversation_id": conv_id,
                "answer": "Please provide a workforce or attendance question.",
                "response": "Please provide a workforce or attendance question.",
                "tools_used": [],
                "data_available": False,
                "status": "error",
                "error": "Empty query provided.",
            }

        # 1. Retrieve the isolated message history for this conversation ID
        history_messages = self.memory.get_messages(conv_id)

        # 2. Get the configured chat model (will raise LLMProviderNotConfiguredError if unconfigured)
        chat_model = get_chat_model()
        tools = self.tool_registry.get_registered_tools()

        model_with_tools = chat_model
        if tools and hasattr(chat_model, "bind_tools"):
            try:
                model_with_tools = chat_model.bind_tools(tools)
            except (NotImplementedError, AttributeError):
                model_with_tools = chat_model

        # 3. Format prompt with current history and new input
        prompt = get_workforce_prompt_template()
        prompt_val = prompt.invoke(
            {
                "chat_history": history_messages,
                "input": trimmed_query,
            }
        )
        messages = prompt_val.to_messages()

        logger.info("Executing workforce agent query for conversation %s", conv_id)
        result = model_with_tools.invoke(messages)

        tools_used: list[str] = []
        data_available = True
        tool_error: str | None = None
        tool_messages: list[ToolMessage] = []

        # 4. Check if the model requested tool executions
        if hasattr(result, "tool_calls") and result.tool_calls:
            for tc in result.tool_calls:
                tool_name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
                tool_args = tc.get("args", {}) if isinstance(tc, dict) else getattr(tc, "args", {})
                tool_id = tc.get("id") if isinstance(tc, dict) else getattr(tc, "id", None)
                if not tool_id:
                    tool_id = str(uuid.uuid4())

                if tool_name:
                    tools_used.append(tool_name)
                    tool = self.tool_registry.get_tool(tool_name)
                    if tool:
                        try:
                            tool_output = tool.invoke(tool_args)
                            if isinstance(tool_output, dict) and tool_output.get("status") == "error":
                                data_available = False
                                tool_error = tool_output.get("message") or "Tool returned an error."
                        except Exception as exc:
                            logger.error("Error executing tool %s: %s", tool_name, exc)
                            tool_output = {
                                "status": "error",
                                "message": f"Tool execution failed: {str(exc)}",
                            }
                            data_available = False
                            tool_error = str(exc)
                    else:
                        tool_output = {
                            "status": "error",
                            "message": f"Tool '{tool_name}' is not registered.",
                        }
                        data_available = False
                        tool_error = f"Tool '{tool_name}' not registered."

                    tool_content = (
                        json.dumps(tool_output)
                        if not isinstance(tool_output, str)
                        else tool_output
                    )
                    tool_messages.append(
                        ToolMessage(
                            content=tool_content,
                            tool_call_id=tool_id,
                            name=tool_name,
                        )
                    )

            if tool_messages:
                turn_messages = list(messages) + [result] + tool_messages
                try:
                    final_result = chat_model.invoke(turn_messages)
                    final_text = (
                        final_result.content
                        if hasattr(final_result, "content")
                        else str(final_result)
                    )
                except Exception as exc:
                    logger.error("Failed to generate final response from tool results: %s", exc)
                    final_text = "Retrieved workforce data, but encountered an error formatting the final response."
                    data_available = False
                    tool_error = str(exc)
            else:
                final_text = result.content if hasattr(result, "content") else str(result)
        else:
            final_text = result.content if hasattr(result, "content") else str(result)

        if isinstance(final_text, list):
            final_text = "".join(
                part.get("text", str(part)) if isinstance(part, dict) else str(part)
                for part in final_text
            )
        response_text = str(final_text)

        # 5. Record the exchange into isolated memory
        self.memory.add_user_message(conv_id, trimmed_query)
        self.memory.add_ai_message(conv_id, response_text)

        return {
            "conversation_id": conv_id,
            "answer": response_text,
            "response": response_text,
            "tools_used": tools_used,
            "data_available": data_available,
            "status": "success" if not tool_error else "error",
            "error": tool_error,
        }


# Global singleton agent service
agent_service = WorkforceAgentService()
