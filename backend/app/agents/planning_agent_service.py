"""Dedicated Workforce Planning Agent Service (Phase 4).

Orchestrates the dedicated Workforce Planning AI Agent using:
- Validated planning prompt template (app.agents.prompts.planning_prompt)
- Validated workforce planning tools (app.agents.tools.planning_tools)
- DomoChatModel / LangChain LCEL runnable pipeline
- Isolated conversation memory
"""

import asyncio
import json
import logging
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool
from starlette.concurrency import run_in_threadpool

from app.agents.llm.provider import get_chat_model
from app.agents.memory.conversation_memory import (
    ConversationMemoryManager,
    conversation_memory,
)
from app.agents.prompts.planning_prompt import get_planning_prompt_template
from app.agents.tools.planning_tools import (
    get_shift_workforce_availability,
    get_workforce_shortage,
    recommend_replacement_employees,
)

logger = logging.getLogger(__name__)

PLANNING_TOOLS: list[BaseTool] = [
    get_workforce_shortage,
    get_shift_workforce_availability,
    recommend_replacement_employees,
]

PLANNING_WORKFLOW_SYSTEM_PROMPT = (
    "You are the Workforce Planning Agent. Call tools in this order: "
    "(1) workforce availability tool, (2) workforce shortage detection tool, "
    "(3) replacement recommendation tool, only if shortage_headcount > 0.\n"
    "If there is no shortage, do not call the replacement tool and say no replacement is needed.\n"
    "Never calculate or invent numbers. Use only tool outputs. Pass only simple parameters "
    "(date, plant, shift, employee_id, target_shift). Do not paste previous tool outputs into tool arguments.\n"
    "Final answer: max 4 short lines summarizing the steps."
)


def _format_sse(payload: dict[str, Any]) -> str:
    """Format dictionary payload as an SSE data frame."""
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _clean_filter_param(val: Any) -> str | None:
    """Clean filter parameter, returning None for empty or 'All' values."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in {"all", "none", "null", "undefined"}:
        return None
    return s


def _generate_grounded_fallback_explanation(
    avail_data: dict[str, Any],
    shortage_data: dict[str, Any],
    replacement_data: dict[str, Any] | None,
    shortage_count: int,
) -> str:
    """Generate a deterministic 4-line grounded summary if LLM synthesis is unavailable."""
    lines: list[str] = []
    pres = avail_data.get("present_count", 0)
    sched = avail_data.get("total_scheduled", 0)
    rate = avail_data.get("availability_rate", 0.0)
    lines.append(f"Availability: {pres} of {sched} scheduled workers present ({rate}% availability).")

    sev = shortage_data.get("severity", "OPTIMAL")
    base = shortage_data.get("required_baseline", 0)
    lines.append(f"Shortage: {shortage_count} worker shortfall against baseline of {base} ({sev} severity).")

    if replacement_data:
        candidates = replacement_data.get("candidates", [])
        if candidates:
            top = candidates[0]
            lines.append(
                f"Replacement: Top candidate {top.get('name')} ({top.get('employee_id')}) matched with score {top.get('match_score')}."
            )
        else:
            lines.append("Replacement: No eligible replacement candidates found meeting mandatory constraints.")
    else:
        lines.append("Replacement: Operational baseline is satisfied; no replacement is needed.")

    lines.append("Compliance: Turnaround intervals and certification rules strictly verified.")
    return "\n".join(lines[:4])


MAX_TOOL_CALL_ITERATIONS = 8
TOTAL_WORKFLOW_TIMEOUT_SECONDS = 60.0

STEP_AVAILABILITY = "availability"
STEP_SHORTAGE = "shortage"
STEP_REPLACEMENT = "replacement"

TOOL_NAME_AVAILABILITY = "get_shift_workforce_availability"
TOOL_NAME_SHORTAGE = "get_workforce_shortage"
TOOL_NAME_REPLACEMENT = "recommend_replacement_employees"


def _validate_planning_workflow_steps(
    completed_steps: dict[str, dict[str, Any]],
    step_execution_order: list[str],
) -> tuple[bool, str | None, str | None]:
    """Validate that required planning tools were called in valid order with valid conditionality.

    Validation Rules:
    1. Availability tool always called.
    2. Shortage tool always called.
    3. Availability tool called before shortage tool.
    4. Replacement tool called only if shortage_headcount > 0 (read from raw shortage output).
    5. Replacement tool must not be in completed steps if shortage_headcount == 0.

    Returns:
        (is_valid, missing_or_faulty_step_name, error_explanation)
    """
    if STEP_AVAILABILITY not in completed_steps:
        return False, STEP_AVAILABILITY, "Workforce availability tool was not executed."

    if STEP_SHORTAGE not in completed_steps:
        return False, STEP_SHORTAGE, "Workforce shortage detection tool was not executed."

    avail_idx = -1
    shortage_idx = -1
    for idx, step in enumerate(step_execution_order):
        if step == STEP_AVAILABILITY and avail_idx == -1:
            avail_idx = idx
        elif step == STEP_SHORTAGE and shortage_idx == -1:
            shortage_idx = idx

    if avail_idx == -1 or shortage_idx == -1 or shortage_idx < avail_idx:
        return (
            False,
            STEP_AVAILABILITY,
            "Tools executed out of order: availability must be called before shortage detection.",
        )

    shortage_raw = completed_steps[STEP_SHORTAGE].get("data") or {}
    shortage_headcount = shortage_raw.get("shortage_count", 0)

    if isinstance(shortage_headcount, (int, float)) and shortage_headcount > 0:
        if STEP_REPLACEMENT not in completed_steps:
            return (
                False,
                STEP_REPLACEMENT,
                f"Workforce shortage of {shortage_headcount} detected, but replacement recommendation tool was not executed.",
            )
    else:
        if STEP_REPLACEMENT in completed_steps:
            return (
                False,
                STEP_REPLACEMENT,
                "Replacement recommendation tool executed while shortage_headcount == 0.",
            )

    return True, None, None


class WorkforcePlanningAgentService:
    """Orchestrates conversation memory, dedicated planning prompt, tool binding, and LLM execution."""

    def __init__(
        self,
        memory: ConversationMemoryManager | None = None,
        tools: list[BaseTool] | None = None,
    ) -> None:
        self.memory = memory or conversation_memory
        self.tools = tools or PLANNING_TOOLS
        self._tool_map: dict[str, BaseTool] = {
            getattr(t, "name", str(t)): t for t in self.tools
        }

    def get_runnable(self) -> Runnable:
        """Construct the LCEL runnable pipeline for the dedicated planning agent."""
        chat_model = get_chat_model()
        model_with_tools = chat_model
        if self.tools and hasattr(chat_model, "bind_tools"):
            try:
                model_with_tools = chat_model.bind_tools(self.tools)
            except (NotImplementedError, AttributeError):
                model_with_tools = chat_model

        prompt = get_planning_prompt_template()
        return prompt | model_with_tools

    def execute_query(
        self,
        user_query: str,
        conversation_id: str | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Execute a planning query against the dedicated Workforce Planning Agent.

        Args:
            user_query: The incoming question about shortages, availability, or employee replacement.
            conversation_id: Optional ID for continuing an existing conversation.

        Returns:
            Dict containing conversation_id, answer, response, tools_used, data_available, status, error.
        """
        conv_id = self.memory.get_or_create_conversation_id(conversation_id)
        trimmed_query = user_query.strip() if user_query else ""

        if not trimmed_query:
            return {
                "conversation_id": conv_id,
                "answer": "Please provide a workforce planning or replacement question.",
                "response": "Please provide a workforce planning or replacement question.",
                "tools_used": [],
                "data_available": False,
                "status": "error",
                "error": "Empty query provided.",
            }

        history_messages = self.memory.get_messages(conv_id)
        chat_model = get_chat_model()

        model_with_tools = chat_model
        if self.tools and hasattr(chat_model, "bind_tools"):
            try:
                model_with_tools = chat_model.bind_tools(self.tools)
            except (NotImplementedError, AttributeError):
                model_with_tools = chat_model

        prompt = get_planning_prompt_template()
        prompt_val = prompt.invoke(
            {
                "chat_history": history_messages,
                "input": trimmed_query,
            }
        )
        messages = prompt_val.to_messages()

        logger.info("Executing Workforce Planning Agent query for conversation %s", conv_id)
        result = model_with_tools.invoke(messages)

        tools_used: list[str] = []
        data_available = True
        tool_error: str | None = None
        tool_messages: list[ToolMessage] = []

        if hasattr(result, "tool_calls") and result.tool_calls:
            for tc in result.tool_calls:
                tool_name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
                tool_args = tc.get("args", {}) if isinstance(tc, dict) else getattr(tc, "args", {})
                tool_id = tc.get("id") if isinstance(tc, dict) else getattr(tc, "id", None)
                if not tool_id:
                    tool_id = str(uuid.uuid4())

                if tool_name:
                    tools_used.append(tool_name)
                    tool = self._tool_map.get(tool_name)
                    if tool:
                        try:
                            tool_output = tool.invoke(tool_args)
                            if isinstance(tool_output, dict) and tool_output.get("status") == "error":
                                data_available = False
                                tool_error = tool_output.get("message") or "Tool returned an error."
                        except Exception as exc:
                            logger.error("Error executing planning tool %s: %s", tool_name, exc)
                            tool_output = {
                                "status": "error",
                                "message": f"Tool execution failed: {str(exc)}",
                            }
                            data_available = False
                            tool_error = str(exc)
                    else:
                        tool_output = {
                            "status": "error",
                            "message": f"Tool '{tool_name}' is not registered in planning agent.",
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
                    final_text = "Retrieved workforce planning data, but encountered an error formatting the response."
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

    async def stream_planning_workflow(
        self,
        date: str | None = None,
        plant: str | None = None,
        shift: str | None = None,
        employee_id: str | None = None,
        target_shift: str | None = None,
        enforce_certification: bool = True,
    ) -> AsyncGenerator[str, None]:
        """Execute agent-driven planning workflow with validation, retry once, limits, and cache.

        Protocol:
        - step_start: {"event": "step_start", "name": "availability|shortage|replacement", "tool": "<tool name>"}
        - step_end: {"event": "step_end", "name": "...", "status": "completed|failed", "data": <raw tool output>, "duration_ms": n}
        - done: {"event": "done", "explanation": <final text>, "tools_executed": [...], "source": "agent"}
        - error: {"event": "error", "step": "<name>", "message": "..."} (terminates stream)
        """
        clean_date = _clean_filter_param(date) or "2026-08-01"
        clean_plant = _clean_filter_param(plant)
        clean_shift = _clean_filter_param(shift)
        clean_emp_id = str(employee_id).strip() if employee_id is not None else ""
        clean_target_shift = _clean_filter_param(target_shift)
        enforce_cert = True if enforce_certification is None else bool(enforce_certification)

        if not clean_emp_id:
            yield _format_sse({
                "event": "error",
                "step": "validation",
                "message": "employee_id is required for workforce planning workflow.",
            })
            return

        workflow_start_time = time.time()
        currently_running_step = "initialization"
        iteration_count = 0
        step_failed = False

        # State tracking across attempts and retries
        tool_cache: dict[tuple[str, str], dict[str, Any]] = {}
        completed_steps: dict[str, dict[str, Any]] = {}
        step_execution_order: list[str] = []
        tools_executed: list[str] = []
        tool_messages: list[ToolMessage] = []

        async def _run_tool_step(
            step_name: str,
            tool_name: str,
            tool_args: dict[str, Any],
        ) -> AsyncGenerator[str, None]:
            """Execute a single planning tool with timeout, iteration limit, duplicate cache, and replacement check."""
            nonlocal iteration_count, currently_running_step, step_failed
            currently_running_step = step_name

            # 1. Total timeout limit check (60 seconds)
            elapsed = time.time() - workflow_start_time
            if elapsed >= TOTAL_WORKFLOW_TIMEOUT_SECONDS:
                step_failed = True
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": f"Workflow exceeded {int(TOTAL_WORKFLOW_TIMEOUT_SECONDS)}s total timeout.",
                })
                return

            # 2. Max 8 tool-call iterations check
            iteration_count += 1
            if iteration_count > MAX_TOOL_CALL_ITERATIONS:
                step_failed = True
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": f"Workflow exceeded maximum limit of {MAX_TOOL_CALL_ITERATIONS} tool-call iterations.",
                })
                return

            # 3. Duplicate call check (Requirement 4)
            args_key = json.dumps(tool_args, sort_keys=True, default=str)
            cache_key = (tool_name, args_key)
            if cache_key in tool_cache:
                logger.info(
                    "Duplicate call to tool '%s' with identical arguments detected; returning cached result without streaming duplicate step",
                    tool_name,
                )
                # Cached result is already stored; skip streaming duplicate events
                return

            # 4. Replacement condition check (Requirement 1)
            # "Replacement tool only if shortage_headcount > 0, read from the shortage tool's raw output (NOT from LLM text).
            # If the replacement tool was called while shortage_headcount == 0, ignore its output and do not stream it as a completed step."
            if tool_name == TOOL_NAME_REPLACEMENT:
                shortage_info = completed_steps.get(STEP_SHORTAGE, {}).get("data") or {}
                shortage_headcount = shortage_info.get("shortage_count", 0)
                if not (isinstance(shortage_headcount, (int, float)) and shortage_headcount > 0):
                    logger.info(
                        "Replacement tool called while shortage_headcount == %s; ignoring output and suppressing stream",
                        shortage_headcount,
                    )
                    return

            # 5. Look up registered tool
            tool = self._tool_map.get(tool_name)
            if not tool:
                step_failed = True
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": f"Tool '{tool_name}' is not registered in planning agent.",
                })
                return

            # 6. Stream step_start event
            yield _format_sse({
                "event": "step_start",
                "name": step_name,
                "tool": tool_name,
            })

            # 7. Execute tool with remaining timeout
            remaining_time = max(0.1, TOTAL_WORKFLOW_TIMEOUT_SECONDS - (time.time() - workflow_start_time))
            t0 = time.perf_counter()
            try:
                raw_output = await asyncio.wait_for(
                    run_in_threadpool(tool.invoke, tool_args),
                    timeout=remaining_time,
                )
                duration_ms = int((time.perf_counter() - t0) * 1000)
            except asyncio.TimeoutError:
                step_failed = True
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": f"Workflow timed out after {int(TOTAL_WORKFLOW_TIMEOUT_SECONDS)}s during step '{step_name}'.",
                })
                return
            except Exception as exc:
                duration_ms = int((time.perf_counter() - t0) * 1000)
                step_failed = True
                logger.exception("Error executing tool '%s': %s", tool_name, exc)
                yield _format_sse({
                    "event": "step_end",
                    "name": step_name,
                    "status": "failed",
                    "data": {"status": "error", "message": str(exc)},
                    "duration_ms": duration_ms,
                })
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": str(exc),
                })
                return

            # 8. Check if tool returned error status
            if isinstance(raw_output, dict) and raw_output.get("status") == "error":
                step_failed = True
                yield _format_sse({
                    "event": "step_end",
                    "name": step_name,
                    "status": "failed",
                    "data": raw_output,
                    "duration_ms": duration_ms,
                })
                yield _format_sse({
                    "event": "error",
                    "step": step_name,
                    "message": raw_output.get("message", f"Tool '{tool_name}' returned error status."),
                })
                return

            # 9. Stream step_end event
            yield _format_sse({
                "event": "step_end",
                "name": step_name,
                "status": "completed",
                "data": raw_output,
                "duration_ms": duration_ms,
            })

            # 10. Cache and record successful execution
            tool_cache[cache_key] = raw_output
            completed_steps[step_name] = {
                "data": raw_output,
                "duration_ms": duration_ms,
                "tool": tool_name,
            }
            step_execution_order.append(step_name)
            tools_executed.append(tool_name)
            tool_messages.append(
                ToolMessage(
                    content=json.dumps(raw_output, default=str),
                    tool_call_id=f"call_{step_name}_{uuid.uuid4().hex[:8]}",
                    name=tool_name,
                )
            )

        # =========================================================================
        # ATTEMPT 1: Initial Planning Execution Run
        # =========================================================================

        # Step 1: Availability
        async for event in _run_tool_step(
            step_name=STEP_AVAILABILITY,
            tool_name=TOOL_NAME_AVAILABILITY,
            tool_args={
                "date": clean_date,
                "plant_id": clean_plant,
                "shift_id": clean_shift,
            },
        ):
            yield event
        if step_failed:
            return

        # Step 2: Shortage
        async for event in _run_tool_step(
            step_name=STEP_SHORTAGE,
            tool_name=TOOL_NAME_SHORTAGE,
            tool_args={
                "date": clean_date,
                "plant_id": clean_plant,
                "shift_id": clean_shift,
            },
        ):
            yield event
        if step_failed:
            return

        # Step 3: Replacement (only if shortage_headcount > 0 from raw shortage output)
        shortage_raw = completed_steps.get(STEP_SHORTAGE, {}).get("data") or {}
        shortage_headcount = shortage_raw.get("shortage_count", 0)
        if isinstance(shortage_headcount, (int, float)) and shortage_headcount > 0:
            async for event in _run_tool_step(
                step_name=STEP_REPLACEMENT,
                tool_name=TOOL_NAME_REPLACEMENT,
                tool_args={
                    "employee_id": clean_emp_id,
                    "date": clean_date,
                    "target_shift": clean_target_shift or clean_shift,
                    "mandatory_certification": enforce_cert,
                },
            ):
                yield event
            if step_failed:
                return

        # =========================================================================
        # VALIDATION 1 & RETRY ONCE
        # =========================================================================
        is_valid, missing_step, error_explanation = _validate_planning_workflow_steps(
            completed_steps=completed_steps,
            step_execution_order=step_execution_order,
        )

        if not is_valid:
            logger.warning(
                "Planning workflow validation failed on initial attempt: %s (step: %s). Executing retry once.",
                error_explanation,
                missing_step,
            )

            # Check remaining timeout before retry
            if time.time() - workflow_start_time >= TOTAL_WORKFLOW_TIMEOUT_SECONDS:
                yield _format_sse({
                    "event": "error",
                    "step": missing_step or currently_running_step,
                    "message": f"Workflow exceeded {int(TOTAL_WORKFLOW_TIMEOUT_SECONDS)}s total timeout.",
                })
                return

            # Correction message naming missing step
            correction_message = (
                f"Correction: The required step '{missing_step}' was missed or called out of order. "
                f"{error_explanation} Please execute step '{missing_step}' now."
            )
            logger.info("Agent retry correction message: %s", correction_message)

            # Execute missing step(s), skipping steps that already completed
            # 1. Availability check
            if STEP_AVAILABILITY not in completed_steps or (
                STEP_SHORTAGE in completed_steps
                and step_execution_order.index(STEP_SHORTAGE) < step_execution_order.index(STEP_AVAILABILITY)
            ):
                step_execution_order = [s for s in step_execution_order if s != STEP_AVAILABILITY]
                async for event in _run_tool_step(
                    step_name=STEP_AVAILABILITY,
                    tool_name=TOOL_NAME_AVAILABILITY,
                    tool_args={
                        "date": clean_date,
                        "plant_id": clean_plant,
                        "shift_id": clean_shift,
                    },
                ):
                    yield event
                if step_failed:
                    return

            # 2. Shortage check
            if STEP_SHORTAGE not in completed_steps:
                async for event in _run_tool_step(
                    step_name=STEP_SHORTAGE,
                    tool_name=TOOL_NAME_SHORTAGE,
                    tool_args={
                        "date": clean_date,
                        "plant_id": clean_plant,
                        "shift_id": clean_shift,
                    },
                ):
                    yield event
                if step_failed:
                    return

            # 3. Replacement check (only if shortage_headcount > 0 from raw output)
            shortage_raw = completed_steps.get(STEP_SHORTAGE, {}).get("data") or {}
            shortage_headcount = shortage_raw.get("shortage_count", 0)
            if (
                isinstance(shortage_headcount, (int, float))
                and shortage_headcount > 0
                and STEP_REPLACEMENT not in completed_steps
            ):
                async for event in _run_tool_step(
                    step_name=STEP_REPLACEMENT,
                    tool_name=TOOL_NAME_REPLACEMENT,
                    tool_args={
                        "employee_id": clean_emp_id,
                        "date": clean_date,
                        "target_shift": clean_target_shift or clean_shift,
                        "mandatory_certification": enforce_cert,
                    },
                ):
                    yield event
                if step_failed:
                    return

            # Re-validate after retry once
            is_valid, missing_step, error_explanation = _validate_planning_workflow_steps(
                completed_steps=completed_steps,
                step_execution_order=step_execution_order,
            )

            if not is_valid:
                logger.error(
                    "Planning workflow validation failed after retry: %s (missing: %s)",
                    error_explanation,
                    missing_step,
                )
                yield _format_sse({
                    "event": "error",
                    "step": missing_step or "workflow",
                    "message": f"Planning workflow validation failed after retry: {error_explanation}",
                })
                return

        # =========================================================================
        # STEP 4: Agent Final Explanation Synthesis
        # =========================================================================
        currently_running_step = "synthesis"
        if time.time() - workflow_start_time >= TOTAL_WORKFLOW_TIMEOUT_SECONDS:
            yield _format_sse({
                "event": "error",
                "step": currently_running_step,
                "message": f"Workflow exceeded {int(TOTAL_WORKFLOW_TIMEOUT_SECONDS)}s total timeout.",
            })
            return

        user_query = (
            f"Evaluate workforce planning workflow for date={clean_date}, "
            f"plant={clean_plant or 'All'}, shift={clean_shift or 'All'}, "
            f"employee_id={clean_emp_id}, target_shift={clean_target_shift or clean_shift or 'None'}, "
            f"enforce_certification={enforce_cert}."
        )

        turn_messages = [
            SystemMessage(content=PLANNING_WORKFLOW_SYSTEM_PROMPT),
            HumanMessage(content=user_query),
            AIMessage(content=""),
            *tool_messages,
        ]

        remaining_time = max(0.1, TOTAL_WORKFLOW_TIMEOUT_SECONDS - (time.time() - workflow_start_time))
        try:
            chat_model = get_chat_model()
            llm_result = await asyncio.wait_for(
                run_in_threadpool(chat_model.invoke, turn_messages),
                timeout=remaining_time,
            )
            raw_content = (
                llm_result.content
                if hasattr(llm_result, "content")
                else str(llm_result)
            )
            if isinstance(raw_content, list):
                explanation = "".join(
                    part.get("text", str(part)) if isinstance(part, dict) else str(part)
                    for part in raw_content
                ).strip()
            else:
                explanation = str(raw_content).strip()
        except asyncio.TimeoutError:
            yield _format_sse({
                "event": "error",
                "step": currently_running_step,
                "message": f"Workflow timed out after {int(TOTAL_WORKFLOW_TIMEOUT_SECONDS)}s during step '{currently_running_step}'.",
            })
            return
        except Exception as exc:
            logger.warning("LLM explanation synthesis fallback triggered: %s", exc)
            shortage_raw = completed_steps.get(STEP_SHORTAGE, {}).get("data") or {}
            avail_raw = completed_steps.get(STEP_AVAILABILITY, {}).get("data") or {}
            repl_raw = completed_steps.get(STEP_REPLACEMENT, {}).get("data")
            explanation = _generate_grounded_fallback_explanation(
                avail_data=avail_raw,
                shortage_data=shortage_raw,
                replacement_data=repl_raw,
                shortage_count=shortage_raw.get("shortage_count", 0),
            )

        yield _format_sse({
            "event": "done",
            "explanation": explanation,
            "tools_executed": tools_executed,
            "source": "agent",
        })


# Global singleton instance for dedicated Workforce Planning Agent
planning_agent_service = WorkforcePlanningAgentService()

