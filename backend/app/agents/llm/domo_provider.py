"""Domo AI Services Text Generation API provider adapter (Phase 7).

Integrates Domo's official /api/ai/v1/text/generation endpoint with
the existing Workforce Management Agent architecture and its 6 tools.
"""

import json
import logging
import os
import re
import uuid
from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import BaseTool

from app.agents.llm.provider import LLMProviderNotConfiguredError

logger = logging.getLogger(__name__)

DEFAULT_DOMO_MODEL = "domo.domo_ai.domogpt-large-v2.2:anthropic"
DEFAULT_DOMO_TIMEOUT = 60.0


def _extract_json_tool_call(text: str) -> dict[str, Any] | None:
    """Safely extract a tool invocation JSON payload from model output."""
    if not text or not text.strip():
        return None

    trimmed = text.strip()

    # 1. Direct JSON parse
    if trimmed.startswith("{") and trimmed.endswith("}"):
        try:
            parsed = json.loads(trimmed)
            if isinstance(parsed, dict) and "tool" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass

    # 2. Markdown code block ```json ... ```
    match_code = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    if match_code:
        try:
            parsed = json.loads(match_code.group(1).strip())
            if isinstance(parsed, dict) and "tool" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass

    # 3. Find JSON object substring with balanced braces
    start_idx = text.find("{")
    while start_idx != -1:
        depth = 0
        in_string = False
        escape = False
        for i in range(start_idx, len(text)):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
            else:
                if ch == '"':
                    in_string = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        candidate = text[start_idx : i + 1]
                        try:
                            parsed = json.loads(candidate)
                            if isinstance(parsed, dict) and "tool" in parsed:
                                return parsed
                        except json.JSONDecodeError:
                            pass
                        break
        start_idx = text.find("{", start_idx + 1)

    return None


def _extract_strict_json(text: str) -> dict[str, Any] | None:
    """Safely extract strict-mode JSON payload from model response.

    Accepts:
    1. {"tool_calls": [{"tool": "name", "args": {...}}]}
    2. {"final": "response text"}
    3. Leniently handles {"tool": "name", "args": {...}} -> {"tool_calls": [...]}
    4. Leniently handles {"answer": "text"} or {"final_answer": "text"} -> {"final": "text"}
    """
    if not text or not text.strip():
        return None

    def _normalize(data: Any) -> dict[str, Any] | None:
        if not isinstance(data, dict):
            return None
        # Check tool_calls list
        if "tool_calls" in data and isinstance(data["tool_calls"], list) and len(data["tool_calls"]) > 0:
            valid_calls = []
            for item in data["tool_calls"]:
                if isinstance(item, dict) and ("tool" in item or "name" in item):
                    tool_name = item.get("tool") or item.get("name")
                    args = item.get("args") or {}
                    if not isinstance(args, dict):
                        args = {}
                    valid_calls.append({"tool": str(tool_name), "args": args})
            if valid_calls:
                return {"tool_calls": valid_calls}
        # Check single tool call
        if "tool" in data and isinstance(data["tool"], str):
            args = data.get("args") or {}
            if not isinstance(args, dict):
                args = {}
            return {"tool_calls": [{"tool": data["tool"], "args": args}]}
        # Check final text
        for key in ("final", "final_answer", "answer"):
            if key in data and data[key] is not None:
                return {"final": str(data[key])}
        return None

    # 1. Direct JSON parse
    trimmed = text.strip()
    try:
        parsed = json.loads(trimmed, strict=False)
        norm = _normalize(parsed)
        if norm:
            return norm
    except json.JSONDecodeError:
        pass

    # 2. Markdown code block ```json ... ```
    match_code = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    if match_code:
        try:
            parsed = json.loads(match_code.group(1).strip(), strict=False)
            norm = _normalize(parsed)
            if norm:
                return norm
        except json.JSONDecodeError:
            pass

    # 3. Balanced braces scan
    start_idx = text.find("{")
    while start_idx != -1:
        depth = 0
        in_string = False
        escape = False
        for i in range(start_idx, len(text)):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
            else:
                if ch == '"':
                    in_string = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        candidate = text[start_idx : i + 1]
                        try:
                            parsed = json.loads(candidate, strict=False)
                            norm = _normalize(parsed)
                            if norm:
                                return norm
                        except json.JSONDecodeError:
                            pass
                        break
        start_idx = text.find("{", start_idx + 1)

    # 4. Regex fallback for {"final": "..."} or {"final": "..." without closing brace
    final_match = re.search(r'["\'](?:final|final_answer|answer)["\']\s*:\s*["\'](.*?)(?:["\']\s*\}|\Z)', text, re.DOTALL)
    if final_match:
        content = final_match.group(1).replace(r"\n", "\n").replace(r"\"", '"').strip()
        if content:
            return {"final": content}

    return None


class DomoChatModel(BaseChatModel):
    """LangChain BaseChatModel adapter for Domo AI Services Text Generation API."""

    base_url: str
    developer_token: str
    model_name: str
    timeout: float = DEFAULT_DOMO_TIMEOUT
    bound_tools: list[Any] = []
    strict_tool_mode: bool = False

    @property
    def _llm_type(self) -> str:
        return "domo_ai_services"

    def bind_tools(self, tools: list[BaseTool], **kwargs: Any) -> "DomoChatModel":
        """Bind available workforce tools to this chat model instance."""
        strict_mode = kwargs.get("strict_tool_mode", self.strict_tool_mode)
        new_model = DomoChatModel(
            base_url=self.base_url,
            developer_token=self.developer_token,
            model_name=self.model_name,
            timeout=self.timeout,
            bound_tools=list(tools),
            strict_tool_mode=strict_mode,
        )
        return new_model

    def _call_domo_api(self, prompt_input: str, system_prompt: str | None = None) -> str:
        """Execute HTTP POST request to Domo /api/ai/v1/text/generation endpoint."""
        endpoint = f"{self.base_url.rstrip('/')}/api/ai/v1/text/generation"
        headers = {
            "X-DOMO-Developer-Token": self.developer_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload: dict[str, Any] = {
            "input": prompt_input,
            "model": self.model_name,
        }
        if system_prompt:
            payload["system"] = system_prompt

        if self.timeout and self.timeout > 0:
            effective_to = float(self.timeout)
        elif os.getenv("DOMO_TIMEOUT"):
            effective_to = float(os.getenv("DOMO_TIMEOUT"))
        else:
            effective_to = DEFAULT_DOMO_TIMEOUT
        logger.info("Dispatching Domo AI Services request (timeout=%.1fs, model=%s)", effective_to, self.model_name)
        try:
            with httpx.Client(timeout=effective_to) as client:
                response = client.post(endpoint, headers=headers, json=payload)
        except httpx.TimeoutException:
            logger.error("Domo AI Services request timed out after %.1f seconds", effective_to)
            raise RuntimeError(f"Domo AI Services request timed out after {effective_to:.1f} seconds. Please try again.")
        except httpx.RequestError as exc:
            logger.error("Failed to connect to Domo AI Services at %s: %s", self.base_url, exc)
            raise RuntimeError(f"Failed to communicate with Domo AI Services: {type(exc).__name__}")

        if response.status_code == 401 or response.status_code == 403:
            logger.error("Domo AI Services authentication failed (status %d)", response.status_code)
            raise RuntimeError("Domo AI Services authentication failed. Invalid or expired developer token.")
        elif response.status_code == 429:
            logger.warning("Domo AI Services rate limit exceeded")
            raise RuntimeError("Domo AI Services rate limit exceeded. Please try again shortly.")
        elif response.status_code != 200:
            logger.error("Domo AI Services returned unexpected status %d: %s", response.status_code, response.text)
            raise RuntimeError(f"Domo AI Services error (HTTP {response.status_code}).")

        try:
            data = response.json()
        except Exception:
            logger.error("Domo AI Services returned non-JSON response")
            raise RuntimeError("Invalid response received from Domo AI Services.")

        # Extract text from output or choices
        output = data.get("output")
        if output is not None and isinstance(output, str):
            return output.strip()

        choices = data.get("choices")
        if choices and isinstance(choices, list) and len(choices) > 0:
            first_choice = choices[0]
            if isinstance(first_choice, dict) and "output" in first_choice:
                return str(first_choice["output"]).strip()

        return str(data)

    def _generate_strict(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Strict tool mode generation for agent runner.

        Each turn requires JSON:
        {"tool_calls": [{"tool": "name", "args": {}}]} OR {"final": "text"}.
        Allows tool calls after ToolMessages exist (multi-step).
        Disables keyword fallback.
        Robust JSON extraction with one retry if output is invalid.
        """
        system_messages = [m for m in messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content if system_messages else None

        tool_descriptions = []
        registered_names: set[str] = set()
        for t in self.bound_tools:
            name = getattr(t, "name", str(t))
            desc = getattr(t, "description", "")
            registered_names.add(name)
            tool_descriptions.append(f"- {name}: {desc}")

        tools_instruction = (
            "Available Workforce Tools:\n" + "\n".join(tool_descriptions)
            if tool_descriptions
            else "No tools bound."
        )

        strict_system_prompt = (
            (f"{system_content}\n\n" if system_content else "")
            + f"{tools_instruction}\n\n"
            "STRICT RESPONSE FORMAT REQUIREMENT:\n"
            "You MUST respond in EVERY turn ONLY with a single valid JSON object.\n"
            "Do NOT include any commentary, explanations, or markdown formatting outside the JSON.\n"
            "Your output must adhere to EXACTLY one of these two schemas:\n\n"
            "Option 1 - If you need to invoke one or more tools to retrieve or verify data:\n"
            '{"tool_calls": [{"tool": "<tool_name>", "args": {<arguments>}}]}\n\n'
            "Option 2 - If you have gathered all necessary data and are ready to provide the final answer:\n"
            '{"final": "<your complete, verified answer>"}'
        )

        dialogue: list[str] = []
        for m in messages:
            if isinstance(m, SystemMessage):
                continue
            elif isinstance(m, HumanMessage):
                dialogue.append(f"User: {m.content}")
            elif isinstance(m, AIMessage):
                if m.tool_calls:
                    tc_summary = json.dumps([{"tool": tc["name"], "args": tc.get("args", {})} for tc in m.tool_calls])
                    dialogue.append(f"Assistant [Tool Calls]: {tc_summary}")
                elif m.content and str(m.content).strip():
                    dialogue.append(f"Assistant: {str(m.content).strip()}")
            elif isinstance(m, ToolMessage):
                t_name = getattr(m, "name", "tool")
                dialogue.append(f"Tool Result ({t_name}): {m.content}")

        transcript = "\n\n".join(dialogue) if dialogue else "Start conversation."

        # Turn attempt 1
        domo_output = self._call_domo_api(
            prompt_input=transcript,
            system_prompt=strict_system_prompt,
        )

        parsed = _extract_strict_json(domo_output)

        # Single retry if output is invalid
        if parsed is None:
            logger.warning(
                "Strict tool mode received invalid JSON. Triggering single retry. Raw output: %.150s",
                domo_output,
            )
            retry_prompt = (
                f"{transcript}\n\n"
                "SYSTEM ERROR: Your previous response was not valid JSON or was missing required keys.\n"
                "You must reply ONLY with a valid JSON object matching one of:\n"
                '{"tool_calls": [{"tool": "<tool_name>", "args": {}}]}\n'
                'or\n'
                '{"final": "<your answer>"}\n'
                "No other text."
            )
            retry_output = self._call_domo_api(
                prompt_input=retry_prompt,
                system_prompt=strict_system_prompt,
            )
            parsed = _extract_strict_json(retry_output)
            if parsed is None:
                logger.error(
                    "Strict tool mode retry also returned non-JSON. Falling back to plain text final answer. Raw: %.150s",
                    retry_output,
                )
                return ChatResult(
                    generations=[ChatGeneration(message=AIMessage(content=retry_output or domo_output, tool_calls=[]))]
                )

        if "tool_calls" in parsed:
            ai_tool_calls = []
            for idx, tc in enumerate(parsed["tool_calls"]):
                t_name = tc.get("tool")
                t_args = tc.get("args") or {}
                call_id = f"call_{t_name}_{uuid.uuid4().hex[:8]}_{idx}"
                ai_tool_calls.append({
                    "name": t_name,
                    "args": t_args,
                    "id": call_id,
                })
            return ChatResult(
                generations=[ChatGeneration(message=AIMessage(content="", tool_calls=ai_tool_calls))]
            )

        final_text = str(parsed.get("final", ""))
        return ChatResult(
            generations=[ChatGeneration(message=AIMessage(content=final_text, tool_calls=[]))]
        )

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Execute chat turn against Domo AI Services."""
        if self.strict_tool_mode:
            return self._generate_strict(messages, stop=stop, **kwargs)

        # 1. Check if tool messages are present (Second turn: Tool execution completed)
        tool_messages = [m for m in messages if isinstance(m, ToolMessage)]
        system_messages = [m for m in messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content if system_messages else None

        # Build conversation transcript from non-system, non-tool messages
        dialogue_parts: list[str] = []
        for m in messages:
            if isinstance(m, HumanMessage):
                dialogue_parts.append(f"User: {m.content}")
            elif isinstance(m, AIMessage):
                if m.content and isinstance(m.content, str) and m.content.strip():
                    dialogue_parts.append(f"Assistant: {m.content.strip()}")

        latest_user_query = ""
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                latest_user_query = str(m.content).strip()
                break

        if len(dialogue_parts) > 1:
            conversation_context = (
                "Conversation History:\n"
                + "\n".join(dialogue_parts[:-1])
                + f"\n\nLatest User Request: {latest_user_query}"
            )
        else:
            conversation_context = f"User Request: {latest_user_query}"

        if tool_messages:
            # Second turn: Synthesize response using actual database facts
            tool_facts = []
            for tm in tool_messages:
                tool_name = getattr(tm, "name", "workforce_tool")
                tool_facts.append(f"Tool Result ({tool_name}):\n{tm.content}")

            synthesis_input = (
                f"{conversation_context}\n\n"
                f"Verified Database Facts:\n"
                + "\n\n".join(tool_facts)
                + "\n\nPlease provide a clear, factual, and complete answer to the user's request "
                "based on the conversation context and the verified database facts above. Do not hallucinate or invent numbers. "
                "Format clearly using markdown tables or bullet points where appropriate. "
                "Preserve PRESENT, ABSENT, LEAVE, and LATE as separate statuses."
            )

            generated_text = self._call_domo_api(
                prompt_input=synthesis_input,
                system_prompt=system_content,
            )
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=generated_text))])

        # 2. First turn with bound tools: Determine if a tool should be executed
        if self.bound_tools:
            tool_descriptions = []
            registered_names = set()
            for t in self.bound_tools:
                name = getattr(t, "name", str(t))
                desc = getattr(t, "description", "")
                registered_names.add(name)
                tool_descriptions.append(f"- {name}: {desc}")

            tool_prompt = (
                f"{system_content or ''}\n\n"
                "Available Workforce Tools:\n"
                + "\n".join(tool_descriptions)
                + "\n\n"
                "Tool Selection Guidelines:\n"
                "- Always prioritize calling a tool to fetch real database facts rather than asking clarifying questions or deflecting.\n"
                "- When the user's message is brief, follow-up, or shorthand, use the Conversation History to understand intent and select the appropriate tool:\n"
                "  * Questions about workforce shortage, shortfall, understaffing -> call 'get_workforce_shortage'.\n"
                "  * Questions about workforce availability, present/absent/late counts for shifts or departments -> call 'get_shift_workforce_availability'.\n"
                "  * Questions about employee replacement, substituting absent workers, who can replace an employee -> call 'recommend_replacement_employees'.\n"
                "  * Questions about 'line', 'in line', 'production line', 'lines', 'sections' -> call 'get_section_analytics'.\n"
                "  * Questions about 'department', 'departments', 'dept' -> call 'get_department_analytics'.\n"
                "  * Questions about 'shift', 'shifts', 'shift A', 'shift B', 'shift C' -> call 'get_shift_analytics'.\n"
                "  * Questions about 'experience', 'tenure', 'categories' -> call 'get_experience_analytics'.\n"
                "  * Questions about 'attendance', 'absent', 'present', 'leave', 'late', 'absenteeism' -> call 'get_attendance_analytics'.\n"
                "  * Questions about overall headcount, active staff, total employees, or teams -> call 'get_workforce_summary'.\n"
                "- If specific date ranges or shift filters are not explicitly specified, call the tool with empty args {} to fetch all records.\n"
                "- NEVER say 'your message got cut off' or refuse to answer. If a query could refer to multiple tools, select the best matching tool.\n"
                "- Respond ONLY with a JSON object in this exact format when calling a tool:\n"
                '{"tool": "<tool_name>", "args": {<optional_arguments>}}\n'
                "- Only respond in plain text without JSON for pure social greetings (e.g. 'hello', 'hi', 'thank you')."
            )

            domo_response = self._call_domo_api(
                prompt_input=conversation_context,
                system_prompt=tool_prompt,
            )

            tool_call_dict = _extract_json_tool_call(domo_response)
            if tool_call_dict and tool_call_dict.get("tool") in registered_names:
                t_name = tool_call_dict["tool"]
                t_args = tool_call_dict.get("args") or {}
                if not isinstance(t_args, dict):
                    t_args = {}
                tool_call_id = f"domo_call_{t_name}_{uuid.uuid4().hex[:8]}"
                ai_msg = AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": t_name,
                            "args": t_args,
                            "id": tool_call_id,
                        }
                    ],
                )
                return ChatResult(generations=[ChatGeneration(message=ai_msg)])

            # Direct text answer without tools (for pure greetings, general remarks)
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=domo_response))])
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=domo_response))])

        # 3. Direct execution without tools
        generated_text = self._call_domo_api(
            prompt_input=conversation_context,
            system_prompt=system_content,
        )
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=generated_text))])


def create_domo_chat_model(
    timeout: float | None = None,
    strict_tool_mode: bool = False,
    **kwargs: Any,
) -> DomoChatModel:
    """Factory function instantiating a DomoChatModel from environment variables.

    Raises:
        LLMProviderNotConfiguredError: If required credentials are missing.
    """
    base_url = os.getenv("DOMO_BASE_URL", "").strip()
    token = os.getenv("DOMO_DEVELOPER_TOKEN", "").strip()
    model_name = os.getenv("MODEL_NAME", DEFAULT_DOMO_MODEL).strip()
    if timeout is None:
        timeout_raw = os.getenv("DOMO_TIMEOUT", "").strip()
        if timeout_raw:
            try:
                timeout = float(timeout_raw)
            except ValueError:
                pass
        if timeout is None:
            try:
                from app.core.config import get_settings
                timeout = get_settings().domo_timeout
            except Exception:
                timeout = DEFAULT_DOMO_TIMEOUT

    if not base_url:
        raise LLMProviderNotConfiguredError(
            "DOMO_BASE_URL is not set. Please configure DOMO_BASE_URL in backend/.env "
            "(e.g. DOMO_BASE_URL=https://<your-instance>.domo.com)."
        )

    if not token:
        raise LLMProviderNotConfiguredError(
            "DOMO_DEVELOPER_TOKEN is not set. Please configure DOMO_DEVELOPER_TOKEN in backend/.env."
        )

    logger.info(
        "Instantiating DomoChatModel (model=%s, effective_timeout=%.1fs, strict_mode=%s)",
        model_name or DEFAULT_DOMO_MODEL,
        timeout,
        strict_tool_mode,
    )

    return DomoChatModel(
        base_url=base_url,
        developer_token=token,
        model_name=model_name or DEFAULT_DOMO_MODEL,
        timeout=timeout,
        strict_tool_mode=strict_tool_mode,
    )
