"""Central Workforce Intelligence Assistant Orchestrator.

Acts as the central conversational intelligence core for the Workforce Management Application:
1. Understands natural language questions and resolves contextual follow-ups.
2. Coordinates multi-domain specialist workforce agents via Multi-Agent Supervisor.
3. Grounded 100% in Neon PostgreSQL records via domain specialist tools.
4. Emits real-time SSE streaming progress with 10s heartbeat and maintains conversational session memory.
5. Guaranteed graceful completion with friendly message on timeout or error without exposing stack traces.
"""

import asyncio
import datetime as dt
import json
import logging
import os
import time
import uuid
from typing import Any, AsyncGenerator

from starlette.requests import Request

from app.agents.attendance_agent_service import attendance_agent_service
from app.agents.attrition_agent_service import attrition_agent_service
from app.agents.llm.provider import get_chat_model, is_llm_configured
from app.agents.memory.conversation_memory import conversation_memory
from app.agents.overtime_agent_service import overtime_agent_service
from app.agents.production_agent_service import production_agent_service
from app.agents.skill_agent_service import skill_agent_service
from app.agents.vendor_agent_service import vendor_agent_service
from app.agents.workforce_planning_agent_service import workforce_planning_agent_service

logger = logging.getLogger(__name__)

UNAVAILABLE_MESSAGE = "The assistant is temporarily unavailable. Please try again in a moment."


class SpecialistAgentMetadata:
    """Metadata specification for an integrated specialist agent."""

    def __init__(
        self,
        agent_id: str,
        name: str,
        domain: str,
        description: str,
        keywords: list[str],
        service_fn: Any,
        synthesizer_fn: Any = None,
        default_table: str = "attendance_transactions",
    ):
        self.agent_id = agent_id
        self.name = name
        self.domain = domain
        self.description = description
        self.keywords = keywords
        self.service_fn = service_fn
        self.synthesizer_fn = synthesizer_fn
        self.default_table = default_table


class SpecialistAgentRegistry:
    """Registry maintaining metadata for all 7 specialist workforce agents."""

    def __init__(self):
        self._agents: dict[str, SpecialistAgentMetadata] = {}
        self._register_default_agents()

    def _register_default_agents(self):
        self._agents["attendance"] = SpecialistAgentMetadata(
            agent_id="attendance",
            name="Attendance & Absenteeism Specialist",
            domain="attendance",
            description="Analyzes employee attendance, shift absenteeism, chronic absenteeism, and late arrivals",
            keywords=["attendance", "absent", "absenteeism", "late", "streak", "chronic"],
            service_fn=attendance_agent_service.execute_attendance_analysis,
            default_table="attendance_transactions",
        )
        self._agents["workforce_planning"] = SpecialistAgentMetadata(
            agent_id="workforce_planning",
            name="Workforce Planning & Allocation Specialist",
            domain="workforce_planning",
            description="Analyzes staffing shortages, line capacity requirements, and replacement recommendations",
            keywords=["shortage", "planning", "allocation", "headcount", "gap", "capacity"],
            service_fn=workforce_planning_agent_service.execute_planning_analysis,
            default_table="daily_line_plan",
        )
        self._agents["overtime"] = SpecialistAgentMetadata(
            agent_id="overtime",
            name="Overtime Optimization Specialist",
            domain="overtime",
            description="Analyzes overtime spending, high-risk burnout operators, and shift OT distribution",
            keywords=["overtime", "ot", "spend", "cost", "hours", "burnout"],
            service_fn=overtime_agent_service.execute_overtime_analysis,
            default_table="daily_overtime_summary",
        )
        self._agents["attrition"] = SpecialistAgentMetadata(
            agent_id="attrition",
            name="Attrition & Retention Specialist",
            domain="attrition",
            description="Analyzes employee exit rates, tenure-based churn, exit reasons, and regrettable losses",
            keywords=["attrition", "turnover", "exit", "resignation", "tenure", "retention"],
            service_fn=attrition_agent_service.execute_attrition_analysis,
            default_table="attrition_transactions",
        )
        self._agents["skill_training"] = SpecialistAgentMetadata(
            agent_id="skill_training",
            name="Skill Matrix & Training Specialist",
            domain="skills",
            description="Analyzes workstation skill gaps, training compliance, and critical operator dependencies",
            keywords=["skill", "training", "competency", "certification", "matrix", "gap"],
            service_fn=skill_agent_service.execute_skill_analysis,
            default_table="operator_skills_matrix",
        )
        self._agents["vendor"] = SpecialistAgentMetadata(
            agent_id="vendor",
            name="Vendor Workforce Specialist",
            domain="vendor",
            description="Analyzes contract partner headcounts, SLA compliance, and supplier concentration",
            keywords=["vendor", "contractor", "staffing", "agency", "sla", "partner"],
            service_fn=vendor_agent_service.execute_vendor_analysis,
            default_table="vendor_master",
        )
        self._agents["production"] = SpecialistAgentMetadata(
            agent_id="production",
            name="Production Workforce Specialist",
            domain="production",
            description="Analyzes manufacturing output, shift productivity per worker, and quality variances",
            keywords=["production", "output", "target", "units", "yield", "efficiency"],
            service_fn=production_agent_service.execute_production_analysis,
            default_table="production_transactions",
        )

    def get(self, agent_id: str) -> SpecialistAgentMetadata | None:
        return self._agents.get(agent_id)

    def list_all(self) -> list[SpecialistAgentMetadata]:
        return list(self._agents.values())


class CentralAgentOrchestrator:
    """Central conversational orchestrator coordinating multi-domain specialist workforce agents."""

    def __init__(self, registry: SpecialistAgentRegistry | None = None):
        self.registry = registry or SpecialistAgentRegistry()

    @staticmethod
    def _make_unavailable_result(conv_id: str, reason: str = "") -> dict[str, Any]:
        """Return structured response when assistant is temporarily unavailable."""
        return {
            "conversation_id": conv_id,
            "answer": UNAVAILABLE_MESSAGE,
            "direct_answer": UNAVAILABLE_MESSAGE,
            "key_metrics": [],
            "evidence": [{"label": "Status", "value": "Temporarily Unavailable"}],
            "trends_and_findings": [],
            "recommendations": [],
            "data_limitations": [UNAVAILABLE_MESSAGE],
            "tables": [],
            "selected_agents": [],
            "tools_used": [],
            "tool_trace": [],
            "conversational_answer": UNAVAILABLE_MESSAGE,
            "data_available": False,
            "error": reason or None,
            "status": "failed",
            "is_partial": False,
            "partial_reason": None,
            "llm_calls": [],
        }

    def execute_query(
        self,
        query: str,
        conversation_id: str | None = None,
        db_session: Any = None,
    ) -> dict[str, Any]:
        """Execute workforce intelligence query using Multi-Agent Supervisor."""
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        trimmed = (query or "").strip()
        if not trimmed:
            return {
                "conversation_id": conv_id,
                "answer": "Please provide a workforce question.",
                "direct_answer": "Please provide a workforce question.",
                "status": "error",
                "error": "Empty query",
                "key_metrics": [],
                "evidence": [],
                "trends_and_findings": [],
                "recommendations": [],
                "data_limitations": ["Query was empty."],
                "tables": [],
                "selected_agents": [],
                "tools_used": [],
                "tool_trace": [],
                "conversational_answer": "Please provide a workforce question.",
                "data_available": False,
            }

        if not is_llm_configured():
            logger.warning("LLM provider is not configured.")
            return self._make_unavailable_result(conv_id, "LLM not configured")

        from app.agents.specialists import (
            build_partial_timeout_answer,
            detect_cross_domain,
            run_supervisor,
        )
        from app.core.config import get_settings

        history_msgs = conversation_memory.get_messages(conv_id)
        logger.info(
            "[SUPERVISOR] Starting run_supervisor conv_id=%s query='%s' history_len=%d",
            conv_id,
            trimmed[:80],
            len(history_msgs),
        )

        settings = get_settings()
        is_cross = detect_cross_domain(trimmed)
        try:
            single_timeout = float(os.getenv("AGENT_TOTAL_TIMEOUT_SEC", str(settings.agent_total_timeout_sec)))
        except (ValueError, TypeError):
            single_timeout = 60.0

        try:
            cross_timeout = float(os.getenv("AGENT_CROSS_DOMAIN_TIMEOUT_SEC", str(settings.agent_cross_domain_timeout_sec)))
        except (ValueError, TypeError):
            cross_timeout = 100.0

        total_timeout = cross_timeout if is_cross else single_timeout
        executor_timeout = total_timeout + (1.0 if total_timeout < 5.0 else 5.0)

        import concurrent.futures
        import threading
        cancel_event = threading.Event()
        tracker: dict[str, Any] = {"tool_trace": [], "llm_calls": []}
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

        try:
            future = executor.submit(
                run_supervisor,
                question=trimmed,
                history=history_msgs,
                total_timeout=total_timeout,
                cancel_event=cancel_event,
                tracker=tracker,
            )
            sup_result = future.result(timeout=executor_timeout)
        except (concurrent.futures.TimeoutError, TimeoutError) as exc:
            cancel_event.set()
            raw_traces = tracker.get("tool_trace", [])
            real_traces = [
                t for t in raw_traces
                if not t.get("tool", "").startswith("ask_") and t.get("ok") and t.get("output")
            ]
            if real_traces:
                logger.info("Supervisor timed out with %d real tool results. Building partial answer.", len(real_traces))
                partial_obj = build_partial_timeout_answer(
                    question=trimmed,
                    traces=raw_traces,
                    consulted_agents=[],
                    timed_out_agents=[],
                    model=None,
                    tracker=tracker,
                )
                p_ans = partial_obj["answer"]
                return {
                    "conversation_id": conv_id,
                    "answer": p_ans,
                    "direct_answer": p_ans.split("\n")[0] if p_ans else "Partial analysis.",
                    "key_metrics": [],
                    "evidence": [{"label": "Agent Execution Mode", "value": "Multi-Agent Supervisor (Partial Timeout)"}],
                    "trends_and_findings": [],
                    "recommendations": [],
                    "data_limitations": [f"Partial analysis. {partial_obj.get('partial_reason', '')}"],
                    "tables": [],
                    "selected_agents": partial_obj.get("selected_agents", []),
                    "tools_used": [t.get("tool") for t in real_traces if t.get("tool")],
                    "tool_trace": real_traces,
                    "conversational_answer": p_ans,
                    "data_available": True,
                    "error": None,
                    "status": "partial",
                    "is_partial": True,
                    "partial_reason": partial_obj.get("partial_reason"),
                    "llm_calls": tracker.get("llm_calls", []),
                    "fallback_reason": None,
                    "is_fallback": False,
                }
            else:
                logger.warning("Supervisor timed out with 0 tool results. Returning unavailable message.")
                return self._make_unavailable_result(conv_id, "Timeout with zero tool results")
        except Exception as exc:
            cancel_event.set()
            logger.error("Supervisor execution failed in execute_query: %s", exc, exc_info=True)
            return self._make_unavailable_result(conv_id, str(exc))
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        answer_text = sup_result.get("answer", "")
        tool_trace = sup_result.get("tool_trace", [])
        selected_agents = sup_result.get("selected_agents", [])
        is_partial = sup_result.get("is_partial", False)
        partial_reason = sup_result.get("partial_reason")

        conversation_memory.add_user_message(conv_id, trimmed)
        conversation_memory.add_ai_message(conv_id, answer_text)

        real_tools_in_trace = [t.get("tool") for t in tool_trace if t.get("tool") and not t.get("tool", "").startswith("ask_")]
        is_timeout_no_tools = not real_tools_in_trace and any(k in (answer_text or "").lower() for k in ["timeout", "temporarily unavailable"])

        if is_timeout_no_tools:
            return self._make_unavailable_result(conv_id, "Timeout with zero tool results")

        sanitized_traces = []
        for t in tool_trace:
            sanitized_traces.append({
                "tool": t.get("tool"),
                "duration_ms": t.get("duration_ms"),
                "ok": t.get("ok", True),
                "args": t.get("args", {}),
            })

        return {
            "conversation_id": conv_id,
            "answer": answer_text,
            "direct_answer": answer_text.split("\n")[0] if answer_text else "Analysis complete.",
            "key_metrics": [],
            "evidence": [
                {"label": "Agent Execution Mode", "value": "Multi-Agent Supervisor (Partial)" if is_partial else "Multi-Agent Supervisor (Tools)"}
            ],
            "trends_and_findings": [],
            "recommendations": [],
            "data_limitations": [f"Partial analysis. {partial_reason}"] if is_partial else ["Analysis grounded in Neon PostgreSQL via domain specialist agents."],
            "tables": [],
            "selected_agents": selected_agents or ["Central Workforce Supervisor"],
            "tools_used": real_tools_in_trace or ["Central Workforce Supervisor"],
            "tool_trace": sanitized_traces,
            "conversational_answer": answer_text,
            "data_available": True,
            "error": None,
            "status": "partial" if is_partial else "success",
            "llm_calls": sup_result.get("llm_calls", []),
            "fallback_reason": None,
            "is_fallback": False,
            "is_partial": is_partial,
            "partial_reason": partial_reason,
        }

    async def stream_orchestration(
        self,
        user_query: str,
        conversation_id: str | None = None,
        client_execution_id: str | None = None,
        request: Request | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream real-time supervisor multi-agent reasoning events via Server-Sent Events (SSE)."""
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        exec_id = client_execution_id or f"EXEC-CENTRAL-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
        start_time = time.time()

        def _format_sse(data: dict[str, Any]) -> str:
            return f"data: {json.dumps(data, default=str)}\n\n"

        async def _is_disconnected() -> bool:
            if request is not None:
                return await request.is_disconnected()
            return False

        stages = [
            {"id": 1, "name": "Understanding User Question", "desc": "Analyzing natural language intent, entities, and context"},
            {"id": 2, "name": "Selecting Specialist Agent", "desc": "Routing query to relevant workforce intelligence specialist(s)"},
            {"id": 3, "name": "Retrieving Neon PostgreSQL Data", "desc": "Querying verified enterprise relational tables"},
            {"id": 4, "name": "Performing Quantitative Analysis", "desc": "Computing baseline variances and domain metrics"},
            {"id": 5, "name": "Generating AI Insights", "desc": "Synthesizing evidence-based findings via Domo AI"},
            {"id": 6, "name": "Preparing Final Response", "desc": "Formatting direct answer, metrics, and recommendations"},
        ]

        yield _format_sse({
            "event": "init",
            "execution_id": exec_id,
            "conversation_id": conv_id,
            "agent_type": "central",
            "title": "Central Workforce Intelligence Assistant",
            "stages": stages,
            "timestamp": dt.datetime.utcnow().isoformat() + "Z",
        })

        if not is_llm_configured():
            logger.warning("LLM provider is not configured for stream.")
            yield _format_sse({
                "event": "done",
                "execution_id": exec_id,
                "conversation_id": conv_id,
                "agent_type": "central",
                "status": "completed",
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "result": self._make_unavailable_result(conv_id, "LLM provider is not configured."),
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })
            return

        try:
            async for chunk in self._stream_supervisor(
                user_query=user_query,
                conv_id=conv_id,
                exec_id=exec_id,
                start_time=start_time,
                stages=stages,
                _format_sse=_format_sse,
                _is_disconnected=_is_disconnected,
            ):
                yield chunk
        except Exception as exc:
            logger.error("Supervisor streaming failed: %s. Emitting friendly done event.", exc, exc_info=True)
            yield _format_sse({
                "event": "done",
                "execution_id": exec_id,
                "conversation_id": conv_id,
                "agent_type": "central",
                "status": "completed",
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "result": self._make_unavailable_result(conv_id, str(exc)),
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })

    async def _stream_supervisor(
        self,
        user_query: str,
        conv_id: str,
        exec_id: str,
        start_time: float,
        stages: list[dict[str, Any]],
        _format_sse: Any,
        _is_disconnected: Any,
    ) -> AsyncGenerator[str, None]:
        """Stream real-time supervisor multi-agent reasoning events driven by on_event callbacks."""
        from app.agents.specialists import run_supervisor

        loop = asyncio.get_running_loop()
        event_queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

        def on_event_cb(evt: dict[str, Any]) -> None:
            loop.call_soon_threadsafe(event_queue.put_nowait, evt)

        history_msgs = conversation_memory.get_messages(conv_id)

        # Initial progress event: Understanding your question...
        yield _format_sse({
            "event": "stage_start",
            "execution_id": exec_id,
            "stage_id": 1,
            "stage_name": stages[0]["name"],
            "status": "running",
            "message": "Understanding your question...",
            "timestamp": dt.datetime.utcnow().isoformat() + "Z",
        })
        last_event_time = time.time()

        def _worker() -> dict[str, Any]:
            try:
                return run_supervisor(
                    question=user_query,
                    history=history_msgs,
                    on_event=on_event_cb,
                )
            finally:
                loop.call_soon_threadsafe(event_queue.put_nowait, None)

        supervisor_future = loop.run_in_executor(None, _worker)
        current_stage_id = 1

        try:
            while True:
                if await _is_disconnected():
                    return

                now = time.time()
                if now - last_event_time >= 10.0:
                    yield _format_sse({
                        "event": "stage_start",
                        "execution_id": exec_id,
                        "stage_id": current_stage_id,
                        "stage_name": stages[min(current_stage_id - 1, len(stages) - 1)]["name"],
                        "status": "running",
                        "message": "Still working...",
                        "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                    })
                    last_event_time = time.time()

                get_task = asyncio.create_task(event_queue.get())
                done, _ = await asyncio.wait(
                    [get_task, supervisor_future],
                    timeout=1.0,
                    return_when=asyncio.FIRST_COMPLETED,
                )

                if get_task in done:
                    event = get_task.result()
                    if event is None:
                        break

                    ev_type = event.get("event")
                    tool_name = event.get("tool", "")
                    agent_id = event.get("agent", "")

                    if ev_type == "tool_start":
                        if tool_name.startswith("ask_"):
                            agent_label = agent_id.replace("_", " ").title() if agent_id else tool_name[4:].replace("_", " ").title()
                            current_stage_id = 2
                            yield _format_sse({
                                "event": "stage_start",
                                "execution_id": exec_id,
                                "stage_id": 2,
                                "stage_name": stages[1]["name"],
                                "status": "running",
                                "message": f"Asking {agent_label}...",
                                "selected_agents": [agent_label],
                                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                            })
                        else:
                            current_stage_id = 3
                            yield _format_sse({
                                "event": "stage_start",
                                "execution_id": exec_id,
                                "stage_id": 3,
                                "stage_name": stages[2]["name"],
                                "status": "running",
                                "message": f"Calling {tool_name}...",
                                "tool": tool_name,
                                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                            })
                        last_event_time = time.time()

                    elif ev_type == "tool_end":
                        dur = int(round(float(event.get("duration_ms", 100))))
                        ok = event.get("ok", True)
                        if tool_name.startswith("ask_"):
                            yield _format_sse({
                                "event": "stage_end",
                                "execution_id": exec_id,
                                "stage_id": 2,
                                "stage_name": stages[1]["name"],
                                "status": "completed" if ok else "warning",
                                "duration_ms": dur,
                                "message": f"Tool finished: {tool_name} ({dur} ms)",
                                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                            })
                        else:
                            yield _format_sse({
                                "event": "stage_end",
                                "execution_id": exec_id,
                                "stage_id": 3,
                                "stage_name": stages[2]["name"],
                                "status": "completed" if ok else "warning",
                                "duration_ms": dur,
                                "message": f"Tool finished: {tool_name} ({dur} ms)",
                                "tool": tool_name,
                                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                            })
                        last_event_time = time.time()
                else:
                    get_task.cancel()
                    if supervisor_future in done:
                        while not event_queue.empty():
                            ev = event_queue.get_nowait()
                            if ev is None:
                                break
                            if ev.get("event") == "tool_end":
                                dur = int(round(float(ev.get("duration_ms", 100))))
                                t_name = ev.get("tool", "")
                                yield _format_sse({
                                    "event": "stage_end",
                                    "execution_id": exec_id,
                                    "stage_id": 3,
                                    "stage_name": stages[2]["name"],
                                    "status": "completed" if ev.get("ok", True) else "warning",
                                    "duration_ms": dur,
                                    "message": f"Tool finished: {t_name} ({dur} ms)",
                                    "tool": t_name,
                                    "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                                })
                        break

            # Progress step: Preparing your answer...
            yield _format_sse({
                "event": "stage_start",
                "execution_id": exec_id,
                "stage_id": 6,
                "stage_name": stages[5]["name"],
                "status": "running",
                "message": "Preparing your answer...",
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })
            last_event_time = time.time()

            try:
                total_timeout = float(os.getenv("AGENT_TOTAL_TIMEOUT_SEC", "60"))
            except (ValueError, TypeError):
                total_timeout = 60.0

            while not supervisor_future.done():
                if await _is_disconnected():
                    return
                now = time.time()
                if now - last_event_time >= 10.0:
                    yield _format_sse({
                        "event": "stage_start",
                        "execution_id": exec_id,
                        "stage_id": 6,
                        "stage_name": stages[5]["name"],
                        "status": "running",
                        "message": "Still working...",
                        "timestamp": dt.datetime.utcnow().isoformat() + "Z",
                    })
                    last_event_time = time.time()

                try:
                    sup_result = await asyncio.wait_for(asyncio.shield(supervisor_future), timeout=1.0)
                    break
                except asyncio.TimeoutError:
                    if (time.time() - start_time) >= total_timeout:
                        raise TimeoutError(f"Supervisor exceeded total timeout of {total_timeout}s")
            else:
                sup_result = supervisor_future.result()

            answer_text = sup_result.get("answer", "")
            tool_trace = sup_result.get("tool_trace", [])
            selected_agents = sup_result.get("selected_agents", [])

            total_ms = int((time.time() - start_time) * 1000)

            conversation_memory.add_user_message(conv_id, user_query)
            conversation_memory.add_ai_message(conv_id, answer_text)

            yield _format_sse({
                "event": "stage_end",
                "execution_id": exec_id,
                "stage_id": 6,
                "stage_name": stages[5]["name"],
                "status": "completed",
                "duration_ms": max(50, total_ms),
                "message": "Answer ready",
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })

            sanitized_traces = []
            for t in tool_trace:
                sanitized_traces.append({
                    "tool": t.get("tool"),
                    "duration_ms": t.get("duration_ms"),
                    "ok": t.get("ok", True),
                })

            result_payload = {
                "conversation_id": conv_id,
                "answer": answer_text,
                "direct_answer": answer_text.split("\n")[0] if answer_text else "Analysis complete.",
                "key_metrics": [],
                "evidence": [{"label": "Agent Execution Mode", "value": "Multi-Agent Supervisor (Tools)"}],
                "trends_and_findings": [],
                "recommendations": [],
                "data_limitations": ["Analysis grounded in Neon PostgreSQL via domain specialist agents."],
                "tables": [],
                "selected_agents": selected_agents or ["Central Workforce Supervisor"],
                "tools_used": [t.get("tool") for t in tool_trace if t.get("tool")] or ["Central Workforce Supervisor"],
                "tool_trace": sanitized_traces,
                "conversational_answer": answer_text,
                "data_available": True,
                "error": None,
                "status": "success",
            }

            yield _format_sse({
                "event": "done",
                "execution_id": exec_id,
                "conversation_id": conv_id,
                "agent_type": "central",
                "status": "completed",
                "total_duration_ms": total_ms,
                "result": result_payload,
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })

        except (asyncio.TimeoutError, TimeoutError) as t_err:
            dur_ms = round((time.time() - start_time) * 1000, 2)
            logger.warning(
                "[TIMEOUT] agent_id='supervisor' tool='supervisor_execution' duration_ms=%.2f ok=False error='TimeoutError'",
                dur_ms,
            )
            yield _format_sse({
                "event": "done",
                "execution_id": exec_id,
                "conversation_id": conv_id,
                "agent_type": "central",
                "status": "completed",
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "result": self._make_unavailable_result(conv_id, "Request timed out."),
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })

        except Exception as exc:
            dur_ms = round((time.time() - start_time) * 1000, 2)
            logger.error("Supervisor streaming error: %s", exc, exc_info=True)
            yield _format_sse({
                "event": "done",
                "execution_id": exec_id,
                "conversation_id": conv_id,
                "agent_type": "central",
                "status": "completed",
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "result": self._make_unavailable_result(conv_id, str(exc)),
                "timestamp": dt.datetime.utcnow().isoformat() + "Z",
            })


central_agent_orchestrator = CentralAgentOrchestrator()
