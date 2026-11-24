"""Agent Runner execution engine for multi-step tool-calling workflows.

Executes iterative agent loops:
  invoke model -> execute all tool calls -> feed results back -> repeat
until the model returns a final answer or max_steps is hit.
"""

import concurrent.futures
import json
import logging
import os
import threading
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
    max_steps: int = 3,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    total_timeout: float | None = None,
    llm_timeout: float | None = None,
    deadline: float | None = None,
    agent_name: str = "agent",
    return_direct_if_single_tool: bool = False,
    cancel_event: threading.Event | None = None,
    tool_trace: list[dict[str, Any]] | None = None,
    llm_calls: list[dict[str, Any]] | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """Execute a multi-step tool agent loop until completion or max_steps limit.

    Args:
        system_prompt: System instructions for the agent.
        tools: List of executable tools available to the model.
        history: Prior conversation message history.
        user_input: Latest user request string or HumanMessage.
        max_steps: Maximum reasoning / tool-calling iterations allowed (default 3).
        on_event: Optional callback receiving lifecycle events ("tool_start", "tool_end").
        model: Optional BaseChatModel instance. If None, resolves configured model.
        total_timeout: Overall timeout in seconds (default from AGENT_TOTAL_TIMEOUT_SEC, 60s).
        llm_timeout: Per-LLM-call timeout in seconds (default from AGENT_LLM_TIMEOUT_SEC, 30s).
        deadline: Optional absolute perf_counter deadline shared across supervisor and specialists.
        agent_name: Identifier for logging per-call latency.
        return_direct_if_single_tool: If True and exactly one tool is called in turn 1,
            returns the tool's answer directly without a second synthesis LLM call.

    Returns:
        dict with keys:
          - answer: Final textual response string
          - tool_trace: List of executed tool call records [{tool, args, duration_ms, ok}]
          - steps: Total number of iterations taken
          - llm_calls: List of [{agent, step, duration_ms}] records
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

    if deadline is None:
        deadline = time.perf_counter() + total_timeout
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
            try:
                active_model = model.bind_tools(list(tools), strict_tool_mode=True)
            except TypeError:
                active_model = model.bind_tools(list(tools))
        except (NotImplementedError, Exception):
            active_model = model

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

    if tool_trace is None:
        tool_trace = []
    if llm_calls is None:
        llm_calls = []
    steps = 0
    answer = ""
    start_time = time.perf_counter()

    def _invoke_model(msgs: list[BaseMessage]) -> Any:
        if cancel_event and cancel_event.is_set():
            logger.info("Agent run cancelled before LLM call (%s)", agent_name)
            raise TimeoutError("Agent run was cancelled")

        now = time.perf_counter()
        active_deadline = deadline
        try:
            from app.agents.specialists import _current_deadline
            cur_ctx_dl = _current_deadline.get()
            if cur_ctx_dl is not None and cur_ctx_dl > active_deadline:
                active_deadline = cur_ctx_dl
        except Exception:
            pass
        remaining = active_deadline - now
        if remaining <= 0:
            logger.warning(
                "[TIMEOUT] agent_id='%s' tool='llm_invoke' duration_ms=0.00 ok=False error='DeadlineExceeded'",
                agent_name,
            )
            raise TimeoutError(f"Agent exceeded total timeout deadline ({remaining:.2f}s remaining)")

        # Cap that call's timeout at min(AGENT_LLM_TIMEOUT_SEC, remaining)
        if llm_timeout and llm_timeout > 0:
            effective_timeout = min(llm_timeout, remaining)
        else:
            effective_timeout = remaining

        if effective_timeout <= 0:
            logger.warning(
                "[TIMEOUT] agent_id='%s' tool='llm_invoke' duration_ms=0.00 ok=False error='NoRemainingTime'",
                agent_name,
            )
            raise TimeoutError("LLM call timed out: no remaining time")

        prompt_chars = sum(len(str(getattr(m, "content", "") or "")) for m in msgs)
        if hasattr(active_model, "timeout"):
            try:
                active_model.timeout = effective_timeout
            except Exception:
                pass
        ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        t_llm0 = time.perf_counter()
        try:
            fut = ex.submit(active_model.invoke, msgs)
            try:
                res = fut.result(timeout=effective_timeout)
                llm_elapsed_ms = round((time.perf_counter() - t_llm0) * 1000, 2)
                resp_content = getattr(res, "content", "") or ""
                response_chars = len(str(resp_content))
                logger.info(
                    "[LLM_LATENCY] agent='%s' step=%d duration_ms=%.2f ms prompt_chars=%d response_chars=%d",
                    agent_name,
                    steps,
                    llm_elapsed_ms,
                    prompt_chars,
                    response_chars,
                )
                llm_calls.append({
                    "agent": agent_name,
                    "step": steps,
                    "duration_ms": llm_elapsed_ms,
                    "prompt_chars": prompt_chars,
                    "response_chars": response_chars,
                })
                return res
            except concurrent.futures.TimeoutError:
                dur_llm = round((time.perf_counter() - t_llm0) * 1000, 2)
                logger.warning(
                    "[TIMEOUT] agent_id='%s' tool='llm_invoke' duration_ms=%.2f ok=False error='TimeoutError'",
                    agent_name,
                    dur_llm,
                )
                raise TimeoutError(f"LLM call timed out after {effective_timeout:.2f}s")
        finally:
            ex.shutdown(wait=False, cancel_futures=True)

    def _execute_single_tool_call(tc: Any) -> tuple[dict[str, Any], ToolMessage, Any]:
        """Execute one tool call, respecting remaining deadline."""
        if cancel_event and cancel_event.is_set():
            logger.info("Agent run cancelled before tool call (%s)", agent_name)
            raise TimeoutError("Agent run was cancelled")

        now = time.perf_counter()
        active_deadline = deadline
        try:
            from app.agents.specialists import _current_deadline
            cur_ctx_dl = _current_deadline.get()
            if cur_ctx_dl is not None and cur_ctx_dl > active_deadline:
                active_deadline = cur_ctx_dl
        except Exception:
            pass
        rem = active_deadline - now
        if rem <= 0:
            raise TimeoutError("Agent exceeded total timeout deadline")

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
            def _call_target() -> Any:
                if hasattr(tool_inst, "invoke"):
                    return tool_inst.invoke(tc_args)
                elif callable(tool_inst):
                    return tool_inst(**tc_args)
                elif hasattr(tool_inst, "run"):
                    return tool_inst.run(tc_args)
                else:
                    raise TypeError(f"Tool '{tc_name}' is not invokable.")

            if tc_name.startswith("ask_"):
                # Specialist tools manage their own deadlines and thread contexts directly.
                # Running directly avoids nested ThreadPoolExecutors that cause thread pool stalls and orphan threads.
                try:
                    tool_output = _call_target()
                except (TimeoutError, concurrent.futures.TimeoutError):
                    dur_to = round((time.perf_counter() - t0) * 1000, 2)
                    logger.warning(
                        "[TIMEOUT] agent_id='%s' tool='%s' duration_ms=%.2f ok=False error='TimeoutError'",
                        agent_name,
                        tc_name,
                        dur_to,
                    )
                    raise
                except Exception as exc:
                    ok = False
                    tool_output = f"Error executing tool '{tc_name}': {type(exc).__name__}: {str(exc)}"
            else:
                import contextvars
                tool_ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                try:
                    fut = tool_ex.submit(contextvars.copy_context().run, _call_target)
                    tool_output = fut.result(timeout=max(0.1, rem))
                except concurrent.futures.TimeoutError:
                    dur_to = round((time.perf_counter() - t0) * 1000, 2)
                    logger.warning(
                        "[TIMEOUT] agent_id='%s' tool='%s' duration_ms=%.2f ok=False error='TimeoutError'",
                        agent_name,
                        tc_name,
                        dur_to,
                    )
                    logger.error("Tool '%s' timed out after %.2fs", tc_name, rem)
                    raise TimeoutError(f"Tool '{tc_name}' timed out after {rem:.2f}s")
                except Exception as exc:
                    ok = False
                    tool_output = f"Error executing tool '{tc_name}': {type(exc).__name__}: {str(exc)}"
                finally:
                    tool_ex.shutdown(wait=False, cancel_futures=True)

        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        err_str = None if ok else ("ToolNotFound" if tool_inst is None else "ToolExecutionError")
        logger.info(
            "[TOOL_CALL] agent_id='%s' tool='%s' duration_ms=%.2f ok=%s error=%s",
            agent_name,
            tc_name,
            duration_ms,
            ok,
            err_str,
        )
        content_str = tool_output if isinstance(tool_output, str) else json.dumps(tool_output, default=str)
        output_size_bytes = len(content_str.encode("utf-8"))
        trace_record = {
            "tool": tc_name,
            "args": tc_args,
            "duration_ms": duration_ms,
            "ok": ok,
            "output": tool_output,
            "output_size_bytes": output_size_bytes,
        }

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
        tool_msg = ToolMessage(
            content=content_str,
            tool_call_id=call_id,
            name=tc_name,
        )
        return trace_record, tool_msg, tool_output

    while steps < max_steps:
        if cancel_event and cancel_event.is_set():
            logger.info("Agent run cancelled in step loop (%s)", agent_name)
            raise TimeoutError("Agent run was cancelled")

        now = time.perf_counter()
        if now >= deadline:
            logger.error("Agent exceeded total timeout deadline")
            raise TimeoutError("Agent exceeded total timeout deadline")

        steps += 1
        logger.debug("Agent runner step %d/%d (%s)", steps, max_steps, agent_name)

        try:
            response = _invoke_model(messages)
        except TimeoutError:
            raise
        except Exception as exc:
            logger.error("Error invoking model at step %d (%s): %s", steps, agent_name, exc)
            raise

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

        # Single-domain shortcut optimization:
        # If return_direct_if_single_tool is True and exactly 1 tool call was issued on step 1,
        # execute that tool and return its answer directly without an extra synthesis LLM call.
        if return_direct_if_single_tool and len(tool_calls) == 1 and steps == 1:
            trace_rec, tm, raw_out = _execute_single_tool_call(tool_calls[0])
            tool_trace.append(trace_rec)
            messages.append(tm)
            if isinstance(raw_out, dict) and "answer" in raw_out:
                answer = raw_out["answer"]
            elif isinstance(raw_out, str):
                answer = raw_out
            else:
                answer = str(raw_out)
            logger.info("Single-domain direct return activated for %s. Skipping synthesis turn.", agent_name)
            break

        # Execute requested tool calls (parallel if len > 1, else sequential)
        turn_tool_messages: list[ToolMessage] = []
        if len(tool_calls) > 1:
            import contextvars
            pool = concurrent.futures.ThreadPoolExecutor(max_workers=min(len(tool_calls), 4))
            try:
                futures = [pool.submit(contextvars.copy_context().run, _execute_single_tool_call, tc) for tc in tool_calls]
                for f in futures:
                    trace_rec, tm, _ = f.result(timeout=max(0.1, deadline - time.perf_counter()))
                    tool_trace.append(trace_rec)
                    turn_tool_messages.append(tm)
            finally:
                pool.shutdown(wait=False, cancel_futures=True)
        else:
            trace_rec, tm, _ = _execute_single_tool_call(tool_calls[0])
            tool_trace.append(trace_rec)
            turn_tool_messages.append(tm)

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
            except TimeoutError:
                raise
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
        "llm_calls": llm_calls,
    }

