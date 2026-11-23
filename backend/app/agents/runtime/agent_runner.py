"""Agent Runner execution engine for multi-step tool-calling workflows.

Executes iterative agent loops:
  invoke model -> execute all tool calls -> feed results back -> repeat
until the model returns a final answer or max_steps is hit.
"""

import concurrent.futures
import json
import logging
import os
import time
import uuid
from collections.abc import Callable
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


def run_tool_agent(
    system_prompt: str,
    tools: list[BaseTool] | list[Any],
    history: list[BaseMessage] | list[dict[str, Any]] | None = None,
    user_input: str | BaseMessage = "",
    max_steps: int = 6,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    total_timeout: float | None = None,
    llm_timeout: float | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """Execute a multi-step tool agent loop until completion or max_steps limit.

    Args:
        system_prompt: System instructions for the agent.
        tools: List of executable tools available to the model.
        history: Prior conversation message history.
        user_input: Latest user request string or HumanMessage.
        max_steps: Maximum reasoning / tool-calling iterations allowed.
        on_event: Optional callback receiving lifecycle events ("tool_start", "tool_end").
        model: Optional BaseChatModel instance. If None, resolves configured model.
        total_timeout: Overall timeout in seconds (default from AGENT_TOTAL_TIMEOUT_SEC, 60s).
        llm_timeout: Per-LLM-call timeout in seconds (default from AGENT_LLM_TIMEOUT_SEC, 30s).

    Returns:
        dict with keys:
          - answer: Final textual response string
          - tool_trace: List of executed tool call records [{tool, args, duration_ms, ok}]
          - steps: Total number of iterations taken
    """
    if total_timeout is None:
        try:
            from app.core.config import get_settings
            total_timeout = float(os.getenv("AGENT_TOTAL_TIMEOUT_SEC", str(get_settings().agent_total_timeout_sec)))
        except Exception:
            total_timeout = 60.0

    if llm_timeout is None:
        try:
            from app.core.config import get_settings
            llm_timeout = float(os.getenv("AGENT_LLM_TIMEOUT_SEC", str(get_settings().agent_llm_timeout_sec)))
        except Exception:
            llm_timeout = 30.0
    if model is None:
        from app.agents.llm.provider import get_chat_model

        try:
            model = get_chat_model(strict_tool_mode=True)
        except (TypeError, Exception):
            model = get_chat_model()

    # Index available tools by name
    tool_map: dict[str, Any] = {}
    for t in tools:
        t_name = getattr(t, "name", None) or getattr(t, "__name__", str(t))
        tool_map[t_name] = t

    # Bind tools to the model if supported (enabling strict_tool_mode when available)
    active_model = model
    if hasattr(model, "bind_tools"):
        try:
            active_model = model.bind_tools(list(tools), strict_tool_mode=True)
        except TypeError:
            active_model = model.bind_tools(list(tools))

    # Assemble initial conversation messages
    messages: list[BaseMessage] = []
    if system_prompt:
        messages.append(SystemMessage(content=str(system_prompt)))

    if history:
        for item in history:
            if isinstance(item, BaseMessage):
                messages.append(item)
            elif isinstance(item, dict):
                role = item.get("role", "user")
                c = item.get("content", "")
                if role == "system":
                    messages.append(SystemMessage(content=c))
                elif role in ("assistant", "ai"):
                    messages.append(AIMessage(content=c))
                else:
                    messages.append(HumanMessage(content=c))

    if user_input:
        if isinstance(user_input, BaseMessage):
            messages.append(user_input)
        else:
            messages.append(HumanMessage(content=str(user_input)))

    tool_trace: list[dict[str, Any]] = []
    steps = 0
    answer = ""
    start_time = time.perf_counter()

    def _invoke_model(msgs: list[BaseMessage]) -> Any:
        if llm_timeout and llm_timeout > 0:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
                fut = ex.submit(active_model.invoke, msgs)
                try:
                    return fut.result(timeout=llm_timeout)
                except concurrent.futures.TimeoutError:
                    logger.error("LLM call timed out after %.1fs (AGENT_LLM_TIMEOUT_SEC)", llm_timeout)
                    raise TimeoutError(f"LLM call timed out after {llm_timeout:.1f}s")
        return active_model.invoke(msgs)

    while steps < max_steps:
        elapsed = time.perf_counter() - start_time
        if total_timeout and total_timeout > 0 and elapsed >= total_timeout:
            logger.error("Agent exceeded total timeout of %.1fs (AGENT_TOTAL_TIMEOUT_SEC)", total_timeout)
            raise TimeoutError(f"Agent exceeded total timeout of {total_timeout:.1f}s")

        steps += 1
        logger.debug("Agent runner step %d/%d", steps, max_steps)

        try:
            response = _invoke_model(messages)
        except TimeoutError:
            raise
        except Exception as exc:
            logger.error("Error invoking model at step %d: %s", steps, exc)
            answer = f"Agent encountered an error invoking the model: {type(exc).__name__}: {str(exc)}"
            break

        if not isinstance(response, AIMessage):
            if isinstance(response, str):
                ai_msg = AIMessage(content=response)
            elif hasattr(response, "content"):
                ai_msg = AIMessage(content=str(response.content))
            else:
                ai_msg = AIMessage(content=str(response))
        else:
            ai_msg = response

        messages.append(ai_msg)

        tool_calls = getattr(ai_msg, "tool_calls", None) or []

        # No tool calls requested: Model produced its final response
        if not tool_calls:
            answer = str(ai_msg.content or "")
            break

        # Execute ALL requested tool calls in this turn
        turn_tool_messages: list[ToolMessage] = []
        for tc in tool_calls:
            if isinstance(tc, dict):
                tc_name = tc.get("name") or tc.get("tool") or ""
                tc_args = tc.get("args") or {}
                call_id = tc.get("id") or f"call_{uuid.uuid4().hex[:8]}"
            else:
                tc_name = getattr(tc, "name", "")
                tc_args = getattr(tc, "args", {})
                call_id = getattr(tc, "id", f"call_{uuid.uuid4().hex[:8]}")

            if not isinstance(tc_args, dict):
                tc_args = {}

            # Event: tool_start
            if on_event:
                try:
                    on_event({
                        "event": "tool_start",
                        "tool": tc_name,
                        "args": tc_args,
                        "tool_call_id": call_id,
                        "step": steps,
                    })
                except Exception as ev_err:
                    logger.warning("on_event tool_start callback raised: %s", ev_err)

            t0 = time.perf_counter()
            tool_inst = tool_map.get(tc_name)
            ok = True
            tool_output: Any = None

            if tool_inst is None:
                ok = False
                tool_output = f"Error: Tool '{tc_name}' is not recognized. Available tools: {list(tool_map.keys())}"
            else:
                try:
                    if hasattr(tool_inst, "invoke"):
                        tool_output = tool_inst.invoke(tc_args)
                    elif callable(tool_inst):
                        tool_output = tool_inst(**tc_args)
                    elif hasattr(tool_inst, "run"):
                        tool_output = tool_inst.run(tc_args)
                    else:
                        ok = False
                        tool_output = f"Error: Tool '{tc_name}' is not invokable."
                except Exception as exc:
                    ok = False
                    tool_output = f"Error executing tool '{tc_name}': {type(exc).__name__}: {str(exc)}"

            duration_ms = round((time.perf_counter() - t0) * 1000, 2)

            tool_trace.append({
                "tool": tc_name,
                "args": tc_args,
                "duration_ms": duration_ms,
                "ok": ok,
            })

            # Event: tool_end
            if on_event:
                try:
                    on_event({
                        "event": "tool_end",
                        "tool": tc_name,
                        "args": tc_args,
                        "tool_call_id": call_id,
                        "duration_ms": duration_ms,
                        "ok": ok,
                        "result": str(tool_output),
                        "step": steps,
                    })
                except Exception as ev_err:
                    logger.warning("on_event tool_end callback raised: %s", ev_err)

            content_str = tool_output if isinstance(tool_output, str) else json.dumps(tool_output, default=str)
            turn_tool_messages.append(
                ToolMessage(
                    content=content_str,
                    tool_call_id=call_id,
                    name=tc_name,
                )
            )

        messages.extend(turn_tool_messages)

        # Force final answer when max_steps limit is reached
        if steps >= max_steps:
            logger.info("Agent runner reached max_steps (%d). Forcing final answer.", max_steps)
            force_prompt = HumanMessage(
                content=(
                    "Maximum steps reached. You must provide a final answer now based on the "
                    "tool results gathered above. Do NOT call any more tools."
                )
            )
            messages.append(force_prompt)
            try:
                final_response = _invoke_model(messages)
                if isinstance(final_response, AIMessage) and final_response.content:
                    answer = str(final_response.content)
                elif hasattr(final_response, "content") and final_response.content:
                    answer = str(final_response.content)
                else:
                    answer = (
                        f"Maximum reasoning steps reached ({max_steps}). Operations executed: "
                        f"{', '.join(t['tool'] for t in tool_trace)}."
                    )
            except Exception as exc:
                logger.error("Error during forced final answer: %s", exc)
                answer = (
                    f"Maximum reasoning steps reached ({max_steps}). Operations executed: "
                    f"{', '.join(t['tool'] for t in tool_trace)}."
                )
            break

    return {
        "answer": answer,
        "tool_trace": tool_trace,
        "steps": steps,
    }

