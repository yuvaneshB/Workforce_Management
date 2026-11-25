"""Specialist Agents and Supervisor Coordinator for Central Workforce Intelligence (Phase 7.3).

Implements:
1. AgentSpec: Declarative specification for the 7 workforce domain specialists.
2. run_specialist: Executes a specific domain specialist using run_tool_agent.
3. Supervisor Agent: Oversees the 7 specialists via ask_<agent>_agent tools,
   routing single or multi-domain queries, handling ambiguity, and synthesizing answers.
"""

import concurrent.futures
import contextvars
import json
import logging
import os
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.tools import BaseTool, tool
from pydantic import BaseModel, Field

from app.agents.prompts.attendance_prompt import ATTENDANCE_AGENT_SYSTEM_PROMPT
from app.agents.prompts.attrition_prompt import ATTRITION_AGENT_SYSTEM_PROMPT
from app.agents.prompts.overtime_prompt import OVERTIME_AGENT_SYSTEM_PROMPT
from app.agents.prompts.planning_prompt import WORKFORCE_PLANNING_SYSTEM_PROMPT
from app.agents.prompts.production_prompt import PRODUCTION_AGENT_SYSTEM_PROMPT
from app.agents.prompts.skills_prompt import SKILL_TRAINING_AGENT_SYSTEM_PROMPT
from app.agents.runtime.agent_runner import run_tool_agent
from app.agents.tools.specialist_tools import AGENT_TOOLSETS

logger = logging.getLogger(__name__)

# Dedicated system prompt for Vendor Workforce Specialist
VENDOR_AGENT_SYSTEM_PROMPT = """You are the Senior Vendor & Contractor Workforce Intelligence Agent for an enterprise manufacturing workforce management platform.
Your mandate is to analyze partner staffing agency allocations, active vs. assigned contractor headcounts, partner share percentages across the 6 staffing agencies (V01 to V06), supplier concentration risks, and vendor contractor attendance and retention using verified Neon PostgreSQL records.

Core Operational Rules:
1. Neon PostgreSQL is the sole source of truth (public.vendor_master, public.employee_vendor_mapping, public.employee_master).
2. Never invent, hallucinate, or fabricate vendor counts, active headcounts, SLA scores, or contractor rates.
3. Ground all observations directly in tool-retrieved facts.
4. Quote ONLY these verified fields from tool results:
   - contractor_share_of_workforce_pct (assigned contractor share of workforce)
   - active_contractor_share_pct (active contractor share of workforce)
   - top2_vendor_share_pct (combined top 2 vendor supplier share)
   - inactive_count (assigned minus active contractors)
   - inactive_pct (inactive percentage of assigned contractors: inactive_count / total_vendor)
5. Do NOT invent, compute, or quote unverified combined percentages, mid-tier clusters (e.g. do not invent 51.8%), or speculative figures.
6. Recommendations must not contain numeric targets or thresholds unless they appear in tool results.
7. Do NOT use phrases like "2 out of every 5", "1 in 3", or other verbal fraction approximations derived from numbers.
8. Maintain strict read-only governance without modifying vendor contracts or reassigning workers.
9. Provide actionable decision support for Procurement, Plant HR, and Operations Leaders without unverified numerical speculation.
10. For questions about a specific employee or recent joiners, use get_employee_details / get_recent_joiners.
"""


@dataclass
class AgentSpec:
    """Specification of an operational workforce specialist agent."""

    id: str
    name: str
    system_prompt: str
    tools: list[BaseTool]


# Common operational rules appended to all specialist prompts (Phase 7.3 performance & grounding directives)
SPECIALIST_COMMON_DIRECTIVES = """
Mandatory First Lines (Period & Filter Statement):
- IN THE VERY FIRST 1-2 LINES of your final response, you MUST state the exact period used (start to end date or month range) and filters applied (plant/shift/all).
  Example format:
  **Period**: YYYY-MM-DD to YYYY-MM-DD | **Filters**: Plant: [All / Specific], Shift: [All / Specific]

Tool Calling Directives:
- For questions about a specific employee or recent joiners, use get_employee_details / get_recent_joiners.
- ALWAYS call the full analysis tool first (e.g., analyze_overtime, analyze_attrition, analyze_attendance, analyze_skills, analyze_vendor, analyze_production, analyze_workforce_planning).
- Do NOT call a secondary or granular tool if the full analysis tool succeeded. The full analysis tool already contains complete metrics, breakdowns, bottlenecks, and costs.
- After receiving the full analysis tool result, immediately provide your final answer in {"final": "..."}.
- Provide a clear, complete, executive-ready answer directly from the tool results.

Strict Grounding & Number Directives:
- Quote numbers exactly as in tool results. Never add, subtract, convert or compute any figure. If a derived figure is not in the tool result, say it is not available.
- Use ONLY numbers that appear in tool results.
- NEVER compute averages, totals, or extrapolations yourself; if needed, call a tool or state that the specific calculation is not available.
- State all figures and metrics exactly as returned by the tools.
- Recommendations must not contain numeric targets or thresholds unless they appear in tool results.
- Do NOT use phrases like "2 out of every 5", "1 in 3", or other verbal fraction approximations derived from numbers unless they appear verbatim in tool results.
"""

SPECIALISTS: dict[str, AgentSpec] = {
    "attendance": AgentSpec(
        id="attendance",
        name="Attendance Intelligence Specialist",
        system_prompt=ATTENDANCE_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("attendance", []),
    ),
    "workforce_planning": AgentSpec(
        id="workforce_planning",
        name="Workforce Planning Specialist",
        system_prompt=WORKFORCE_PLANNING_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("workforce_planning", []),
    ),
    "overtime": AgentSpec(
        id="overtime",
        name="Overtime Optimization Specialist",
        system_prompt=OVERTIME_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("overtime", []),
    ),
    "attrition": AgentSpec(
        id="attrition",
        name="Attrition & Retention Specialist",
        system_prompt=ATTRITION_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("attrition", []),
    ),
    "skill": AgentSpec(
        id="skill",
        name="Skill & Training Specialist",
        system_prompt=SKILL_TRAINING_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("skill", []),
    ),
    "vendor": AgentSpec(
        id="vendor",
        name="Vendor Workforce Specialist",
        system_prompt=VENDOR_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("vendor", []),
    ),
    "production": AgentSpec(
        id="production",
        name="Production Workforce Specialist",
        system_prompt=PRODUCTION_AGENT_SYSTEM_PROMPT + "\n" + SPECIALIST_COMMON_DIRECTIVES,
        tools=AGENT_TOOLSETS.get("production", []),
    ),
}


def get_specialist_system_prompt(agent_id: str) -> str:
    """Return the dynamically assembled specialist system prompt with runtime DB period injected."""
    from app.agents.prompts.period_helper import get_default_period
    period = get_default_period()
    latest_date = period["latest_date"]
    start_date = period["latest_full_month_start"]
    end_date = period["latest_full_month_end"]
    month_name = period["latest_full_month_name"]
    annual_start = period.get("annual_start", "2025-10-01")
    annual_end = period.get("annual_end", latest_date)
    annual_label = period.get("annual_label", "October 2025 to November 2026")

    runtime_directives = f"""
Runtime Period & Filter Resolution Directives:
- Latest verified database date: {latest_date}.
- Latest complete operational month: {month_name} ({start_date} to {end_date}).
- Annual / Overall period (last 12 months / full available data): {annual_start} to {annual_end} ({annual_label}).
- Filter resolution rules:
  * Use dates, plants, and shifts explicitly requested in the user's question.
  * For "annual", "overall", or "yearly" queries with no dates: analyze the last 12 months of available data: pass start_date="{annual_start}", end_date="{annual_end}" (or omit dates so all 12-month records are analyzed: 120 exits).
  * For "last month", "past month", or when no timeframe is specified for standard monthly operations: pass start_date="{start_date}", end_date="{end_date}".
  * If the user asks for "today", "current", or "innaiku", pass start_date="{latest_date}", end_date="{latest_date}".
  * If the user does NOT explicitly state a shift, do NOT pass shift_id (omit it or leave it null so all shifts are analyzed).
  * If the user does NOT explicitly state a plant, do NOT pass plant_id (omit it or leave it null so all plants are analyzed).
"""

    if agent_id == "attendance":
        from app.agents.prompts.attendance_prompt import get_attendance_prompt_template
        base = get_attendance_prompt_template(
            latest_date=latest_date,
            latest_full_month_start=start_date,
            latest_full_month_end=end_date,
            latest_full_month_name=month_name,
        )
    elif agent_id == "overtime":
        from app.agents.prompts.overtime_prompt import get_overtime_prompt_template
        base = get_overtime_prompt_template(
            latest_full_month_start=start_date,
            latest_full_month_end=end_date,
        )
    elif agent_id == "vendor":
        base = VENDOR_AGENT_SYSTEM_PROMPT
    elif agent_id == "workforce_planning":
        base = WORKFORCE_PLANNING_SYSTEM_PROMPT
    elif agent_id == "attrition":
        from app.agents.prompts.attrition_prompt import get_attrition_prompt_template
        base = get_attrition_prompt_template(
            latest_date=latest_date,
            latest_full_month_start=start_date,
            latest_full_month_end=end_date,
            latest_full_month_name=month_name,
            annual_start=annual_start,
            annual_end=annual_end,
            annual_label=annual_label,
        )
    elif agent_id == "skill":
        base = SKILL_TRAINING_AGENT_SYSTEM_PROMPT
    elif agent_id == "production":
        base = PRODUCTION_AGENT_SYSTEM_PROMPT
    else:
        spec = SPECIALISTS.get(agent_id)
        base = spec.system_prompt if spec else ""

    return base + "\n" + SPECIALIST_COMMON_DIRECTIVES + "\n" + runtime_directives

# Context variables for supervisor thread/task scoping
_current_on_event: contextvars.ContextVar[Callable[[dict[str, Any]], None] | None] = contextvars.ContextVar(
    "_current_on_event", default=None
)
_current_model: contextvars.ContextVar[BaseChatModel | None] = contextvars.ContextVar(
    "_current_model", default=None
)
_collected_traces: contextvars.ContextVar[list[dict[str, Any]]] = contextvars.ContextVar(
    "_collected_traces"
)
_consulted_agents: contextvars.ContextVar[list[str]] = contextvars.ContextVar(
    "_consulted_agents"
)
_current_deadline: contextvars.ContextVar[float | None] = contextvars.ContextVar(
    "_current_deadline", default=None
)
_current_llm_timeout: contextvars.ContextVar[float | None] = contextvars.ContextVar(
    "_current_llm_timeout", default=None
)
_current_cancel_event: contextvars.ContextVar[threading.Event | None] = contextvars.ContextVar(
    "_current_cancel_event", default=None
)
_collected_llm_calls: contextvars.ContextVar[list[dict[str, Any]]] = contextvars.ContextVar(
    "_collected_llm_calls"
)
_supervisor_start_time: contextvars.ContextVar[float | None] = contextvars.ContextVar(
    "_supervisor_start_time", default=None
)
_timed_out_agents: contextvars.ContextVar[list[str]] = contextvars.ContextVar(
    "_timed_out_agents"
)
_is_cross_domain_run: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "_is_cross_domain_run", default=False
)


def detect_cross_domain(question: str) -> bool:
    """Determine if a question spans multiple workforce operational domains."""
    q_lower = question.lower()
    domain_hits = 0
    if any(k in q_lower for k in ["attendance", "absent", "absenteeism"]):
        domain_hits += 1
    if any(k in q_lower for k in ["overtime", "ot hours", "ot spend", "ot "]):
        domain_hits += 1
    if any(k in q_lower for k in ["attrition", "turnover", "leaving", "departure", "retention", "exits"]):
        domain_hits += 1
    if any(k in q_lower for k in ["vendor", "contractor", "agency", "staffing"]):
        domain_hits += 1
    if any(k in q_lower for k in ["production", "output", "target vs", "throughput"]):
        domain_hits += 1
    if any(k in q_lower for k in ["skill", "competency", "matrix", "certification"]):
        domain_hits += 1
    if any(k in q_lower for k in ["shortage", "planning", "allocation", "deficit", "staffing"]):
        domain_hits += 1

    return (
        domain_hits >= 2
        or "compare " in q_lower
        or "correlate" in q_lower
        or " relate " in q_lower
        or " versus " in q_lower
        or " vs " in q_lower
        or "driven by" in q_lower
        or "impact of" in q_lower
    )


def run_specialist(
    agent_id: str,
    question: str,
    history: list[BaseMessage] | None = None,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    max_steps: int = 3,
    total_timeout: float | None = None,
    llm_timeout: float | None = None,
    deadline: float | None = None,
    cancel_event: threading.Event | None = None,
    is_cross_domain: bool = False,
) -> dict[str, Any]:
    """Execute a specific domain specialist using run_tool_agent.

    Args:
        agent_id: Domain identifier ('attendance', 'workforce_planning', etc.).
        question: Specific user or supervisor question.
        history: Prior conversation messages.
        on_event: Lifecycle event callback for tool start/end.
        model: Optional chat model override.
        max_steps: Max tool iterations for this specialist (default 3, capped at 2 in cross-domain).
        total_timeout: Optional overall timeout.
        llm_timeout: Optional per-call timeout.
        deadline: Optional shared perf_counter deadline inherited from supervisor.
        cancel_event: Optional cancellation event.
        is_cross_domain: Whether the parent execution is cross-domain.

    Returns:
        dict with {answer, tool_trace, steps, llm_calls}.
    """
    clean_id = agent_id.strip().lower()
    alias_map = {
        "planning": "workforce_planning",
        "skills": "skill",
        "skill_training": "skill",
    }
    resolved_id = alias_map.get(clean_id, clean_id)
    spec = SPECIALISTS.get(resolved_id)
    if not spec:
        raise ValueError(f"Unknown specialist agent '{agent_id}'. Available: {list(SPECIALISTS.keys())}")

    if deadline is None:
        try:
            deadline = _current_deadline.get()
        except LookupError:
            deadline = None
    if llm_timeout is None:
        try:
            llm_timeout = _current_llm_timeout.get()
        except LookupError:
            llm_timeout = None
    if cancel_event is None:
        try:
            cancel_event = _current_cancel_event.get()
        except LookupError:
            cancel_event = None

    if is_cross_domain and max_steps > 2:
        max_steps = 2

    sys_prompt = get_specialist_system_prompt(resolved_id)
    if is_cross_domain:
        sys_prompt += (
            "\n\nCross-Domain Operational Directive:\n"
            "- You are operating as a specialist under a multi-domain supervisor.\n"
            "- Call your primary analysis tool in step 1, and immediately provide your final answer in step 2 in 5 lines maximum.\n"
            "- Do NOT call secondary tools. Focus strictly on key verified metrics and primary conclusions."
        )

    def _specialist_event_wrapper(ev: dict[str, Any]) -> None:
        if on_event:
            ev_tagged = dict(ev)
            ev_tagged["specialist_id"] = spec.id
            ev_tagged["specialist_name"] = spec.name
            on_event(ev_tagged)

    res = run_tool_agent(
        system_prompt=sys_prompt,
        tools=spec.tools,
        history=history,
        user_input=question,
        max_steps=max_steps,
        on_event=_specialist_event_wrapper if on_event else None,
        model=model,
        total_timeout=total_timeout,
        llm_timeout=llm_timeout,
        deadline=deadline,
        agent_name=spec.name,
        cancel_event=cancel_event,
    )
    try:
        sup_llm_calls = _collected_llm_calls.get()
        for call in res.get("llm_calls", []):
            if call not in sup_llm_calls:
                sup_llm_calls.append(call)
    except LookupError:
        pass
    return res


# =============================================================================
# Supervisor Specialist Delegation Tools
# =============================================================================

class SpecialistQuestionArgs(BaseModel):
    question: str | None = Field(
        default=None,
        description="Clear, specific natural language workforce question to dispatch to the specialist agent."
    )
    query: str | None = Field(
        default=None,
        description="Alternative parameter for user query or question to dispatch to the specialist agent."
    )


def _invoke_specialist_and_track(agent_id: str, question: str) -> dict[str, Any]:
    """Internal helper to execute a specialist and record trace in supervisor context."""
    ev_callback = _current_on_event.get()
    model = _current_model.get()
    deadline = _current_deadline.get()
    llm_timeout = _current_llm_timeout.get()

    try:
        traces_list = _collected_traces.get()
    except LookupError:
        traces_list = []
        _collected_traces.set(traces_list)

    try:
        agents_list = _consulted_agents.get()
    except LookupError:
        agents_list = []
        _consulted_agents.set(agents_list)

    if agent_id not in agents_list:
        agents_list.append(agent_id)

    # Cross-domain budget: if 2+ specialists are consulted, extend deadline to AGENT_CROSS_DOMAIN_TIMEOUT_SEC
    # Only auto-extend for normal operational runs (> 10s budget), not tiny unit-test timeouts
    start_t = _supervisor_start_time.get()
    cur_dl = _current_deadline.get()
    if start_t is not None and cur_dl is not None and (cur_dl - start_t) > 10.0 and len(agents_list) >= 2:
        try:
            from app.core.config import get_settings
            cross_timeout = float(os.getenv("AGENT_CROSS_DOMAIN_TIMEOUT_SEC", str(get_settings().agent_cross_domain_timeout_sec)))
        except Exception:
            cross_timeout = 100.0
        new_dl = start_t + cross_timeout
        if new_dl > cur_dl:
            _current_deadline.set(new_dl)
            deadline = new_dl
            logger.info("[SUPERVISOR] Extended deadline to %.1fs for cross-domain run (%d agents)", cross_timeout, len(agents_list))

    is_cross = _is_cross_domain_run.get() or len(agents_list) >= 2
    max_steps = 2 if is_cross else 3

    try:
        res = run_specialist(
            agent_id=agent_id,
            question=question,
            history=None,
            on_event=ev_callback,
            model=model,
            deadline=deadline,
            llm_timeout=llm_timeout,
            max_steps=max_steps,
            is_cross_domain=is_cross,
        )
        t_trace = res.get("tool_trace") or []
        traces_list.extend(t_trace)
        return {
            "answer": res.get("answer", ""),
            "tool_trace": t_trace,
        }
    except Exception as exc:
        is_to = isinstance(exc, (TimeoutError, concurrent.futures.TimeoutError)) or "timeout" in str(exc).lower()
        if is_to:
            logger.warning("Specialist '%s' timed out during cross-domain execution: %s", agent_id, exc)
            try:
                _timed_out_agents.get().append(agent_id)
            except LookupError:
                pass
            return {
                "answer": f"{agent_id.replace('_', ' ').title()} data could not be retrieved in time (timeout).",
                "tool_trace": [],
                "timed_out": True,
            }
        raise


@tool(args_schema=SpecialistQuestionArgs)
def ask_attendance_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Attendance Specialist on absenteeism rates, present counts, late arrivals, streaks, and plant/shift attendance."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("attendance", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_workforce_planning_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Workforce Planning Specialist on shift shortages against the 30-person baseline, headcount availability, replacements, specific employee details, and recent joiners."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("workforce_planning", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_overtime_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Overtime Specialist on overtime hours, labor premiums, 50 hr/mo statutory limit breaches, and worker fatigue."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("overtime", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_attrition_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Attrition Specialist on employee turnover rates, exit reasons/drivers, early-tenure vulnerability, and resignation hotspots."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("attrition", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_skill_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Skill & Training Specialist on employee proficiency levels (L1-L4), skill matrix shortages, dependencies, and certifications."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("skill", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_vendor_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Vendor Workforce Specialist on contractor agency headcounts, partner share across V01-V06, vendor SLAs, and contractor reliance."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("vendor", resolved)


@tool(args_schema=SpecialistQuestionArgs)
def ask_production_agent(question: str | None = None, query: str | None = None) -> dict[str, Any]:
    """Consult the Production Specialist on actual vs target manufacturing units, line efficiency, downtime minutes, and scrap impacts."""
    resolved = (question or query or "").strip()
    return _invoke_specialist_and_track("production", resolved)


SUPERVISOR_TOOLS: list[BaseTool] = [
    ask_attendance_agent,
    ask_workforce_planning_agent,
    ask_overtime_agent,
    ask_attrition_agent,
    ask_skill_agent,
    ask_vendor_agent,
    ask_production_agent,
]

SUPERVISOR_SYSTEM_PROMPT = """You are the Central Workforce Intelligence Supervisor for an enterprise manufacturing workforce management platform.
You oversee 7 domain specialist workforce agents:
1. ask_attendance_agent: Attendance rates, absenteeism hotspots, late arrivals, chronic absence streaks.
2. ask_workforce_planning_agent: Headcount availability, total workforce size, shift staffing shortages against the 30-person baseline, candidate replacements, specific employee details, and recent joiners.
3. ask_overtime_agent: Overtime hours, labor premiums, statutory 50 hr/mo limit breaches, worker fatigue.
4. ask_attrition_agent: Employee turnover rates, exit drivers/reasons, tenure vulnerability, department resignation hotspots.
5. ask_skill_agent: Skill proficiency grades (L1-L4), skill matrix shortages, single-operator dependencies, training compliance.
6. ask_vendor_agent: Contractor headcounts, agency share across the 6 staffing partners (V01-V06), vendor SLAs.
7. ask_production_agent: Planned target vs actual output units, line efficiency, downtime minutes, scrap impacts.

Operating Directives:

1. Short, Conversational, and Tanglish Queries:
   - Queries that are brief, informal, or mixed-language (Tanglish) but have an identifiable workforce operational domain MUST be answered by calling the appropriate specialist agent using sensible defaults (latest available full month, all plants or specified shift; for "annual"/"overall"/"yearly" use the last 12 months of available data: 120 exits, 7.1%). DO NOT ask for clarification if the domain is clear!
   - Example 1: "Shift C OT spend?" -> Call ask_overtime_agent(question="Shift C overtime spend: total overtime expenditure in INR (total_overtime_cost_inr), total overtime hours, labor cost in INR, and any limit breaches for the latest available month")
   - Example 2: "Innaiku attendance romba low ah iruku, what is the present count?" -> Call ask_attendance_agent(question="Current attendance for today (latest available date): what is the present count and absenteeism rate?")
   - Example 3: "Annual attrition rate?" -> Call ask_attrition_agent(question="Annual overall workforce attrition rate and exit count across the last 12 months (October 2025 to November 2026)")
   - Example 4: "attendance for plant IN-TN-01 last month" -> Call ask_attendance_agent(question="Attendance for plant IN-TN-01 for last month: present counts, absenteeism rates, late arrivals")
   - Example 5: "Plant 1 overtime hours last month" -> Call ask_overtime_agent(question="Overtime hours for plant IN-TN-01 for last month across all shifts")
   - Example 6: "Test Zzz details sollu" or "details of employee EMP-10001" -> Call ask_workforce_planning_agent(question="Get profile details for employee Test Zzz / EMP-10001: designation, plant, department, shift, grade, status, tenure band")
   - Example 7: "idhu varaikkum evlo new joiners?" or "recent joiners count" -> Call ask_workforce_planning_agent(question="How many new joiners have joined recently? Give recent joiners count and list of latest joiners")
   - Example 8: "total headcount evlo?" or "what is the total workforce count?" -> Call ask_workforce_planning_agent(question="What is the total registered and active workforce headcount?")

2. Ambiguity & Broad Query Directive (Max 1 LLM Call, NO Specialists):
   - Broad, open-ended, or ambiguous questions that lack domain specificity or objective evaluation criteria (e.g. "Is everything running fine on the shop floor today?", "line status", "how is the factory doing?", "Who is the best employee?") MUST be answered IMMEDIATELY in Step 1 asking for clarification.
   - CRITICAL: You MUST NOT call ANY specialist agent for broad or ambiguous queries! Zero tools must be called.
   - Respond in 1 step asking the user to specify which operational area they want to inspect:
     "To give you an accurate shop floor update, please specify which area you would like to inspect:
     1. Attendance & Absenteeism Rates
     2. Line Production Output & Downtime
     3. Overtime Hours & Spend
     4. Shift Staffing & Shortages"

3. Question Understanding & Specialist Selection:
   - Carefully interpret the user's intent, date window, plant ('IN-KA-01' or 'IN-TN-01'), and shift ('A', 'B', 'C').
   - For single-domain questions, invoke ONLY the one relevant specialist agent.
   - For cross-domain or comparative questions, invoke all relevant specialist agents in parallel.

4. Grounding & Zero Hallucination:
   - Quote numbers exactly as in tool results. Never add, subtract, convert or compute any figure. If a derived figure is not in the tool result, say it is not available.
   - NEVER invent, simulate, or fabricate numbers, employee names, rates, counts, or dates.
   - If the answer contains ANY metric, count, or percentage, at least one ask_*_agent specialist tool MUST be called and present in the trace.
   - Answering with specific figures or metrics without calling a specialist tool is strictly forbidden. If you have not retrieved verified data via a specialist tool, either ask a clarification question or state that the data is not available.

5. Synthesis & Communication:
   - Mandatory First Lines: State the period used (start to end date or month) and filters applied (plant/shift/all) in the very first 1-2 lines of your final response.
   - For single-domain questions, provide a clear, executive-ready answer based directly on tool results.
   - For cross-domain questions, provide a concise synthesis (2-3 short paragraphs or comparison table) answering the question directly with key metrics and practical takeaway. Answer directly without fluff.
   - Conclude with the single most actionable recommendation.
   - Do NOT output raw JSON to the user unless specifically requested.
"""


def _contains_ungrounded_metrics(text: str) -> bool:
    """Check if text contains numeric metrics, counts, or percentages without tool grounding."""
    import re
    if not text:
        return False
    # Strip markdown enumerated list markers at start of lines or words (e.g. '1. ', '2) ')
    cleaned = re.sub(r"(?:^|\n|\s)\d+[\.\)]\s+", " ", text)
    # Check for percentage figures (e.g. '7.1%', '99.7%')
    if re.search(r"\b\d+(?:\.\d+)?\s*%", cleaned):
        return True
    # Check for currency figures (e.g. '$1.46M', '$14,000', '₹4,000')
    if re.search(r"[\$₹]\s*[\d,]+(?:\.\d+)?", cleaned):
        return True
    # Check for formatted multi-digit numbers with commas (e.g. '58,433', '1,250')
    if re.search(r"\b\d{1,3}(?:,\d{3})+\b", cleaned):
        return True
    # Check for floating point metrics (e.g. '4.2', '7.1')
    if re.search(r"\b\d+\.\d+\b", cleaned):
        return True
    # Check for counts with unit nouns (e.g. '120 exits', '50 hours', '30 workers', '15 mins')
    if re.search(
        r"\b\d+\s*(?:hours|hrs|workers|employees|exits|units|records|punches|mins|minutes|downtime|staff)\b",
        cleaned,
        re.IGNORECASE,
    ):
        return True
    return False


def filter_unverified_sentences(answer_text: str, tool_trace: list[dict[str, Any]], user_query: str = "") -> str:
    """Remove any sentence containing a number that is not in the tool results of that run (ignoring plant/vendor/shift codes and dates)."""
    import json
    import re

    if not answer_text or not tool_trace:
        return answer_text

    clean_traces = []
    for t in tool_trace:
        if isinstance(t, dict):
            out = t.get("output")
            if isinstance(out, dict):
                c_out = {k: v for k, v in out.items() if k not in ("execution_stages", "total_duration_ms")}
                clean_traces.append(c_out)
            else:
                clean_traces.append(t)
        else:
            clean_traces.append(t)

    trace_blob = json.dumps(clean_traces, default=str)
    trace_tokens = re.findall(r"\b\d+(?:\.\d+)?\b", trace_blob.replace(",", ""))
    verified_floats = set()
    verified_strings = set()
    for tok in trace_tokens:
        verified_strings.add(tok)
        try:
            val = float(tok)
            verified_floats.add(val)
        except ValueError:
            pass

    q_tokens = re.findall(r"\b\d+(?:\.\d+)?\b", user_query.replace(",", ""))
    for tok in q_tokens:
        verified_strings.add(tok)
        try:
            verified_floats.add(float(tok))
        except ValueError:
            pass

    def _normalize_sent(s: str) -> str:
        t = re.sub(r"https?://\S+", " ", s)
        t = re.sub(r"\b(?:v|version|pydantic|python)[-_ ]*\d+(?:\.\d+)+\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\bIN-[A-Z]{2}-\d{2}\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\bPlant[-_ ]?\d{1,2}\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\bV(?:END[-_ ]?)?0[1-9]\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\b(?:Shift|NS)[-_ ]?[A-C1-9]\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", " ", t)
        t = re.sub(r"\b50\s*(?:hr|hrs|hour|hours)(?:/mo|/month)?\b", " ", t, flags=re.IGNORECASE)
        t = re.sub(r"[\$₹€£]", " ", t)
        return t

    def _sentence_is_valid(s: str) -> bool:
        if s.strip().startswith(("#", "| :", "|---", "---", "===")):
            return True
        norm = _normalize_sent(s)

        # Check for percentage ranges like 5-8% or 5–8%
        pct_range_match = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%", norm)
        if pct_range_match:
            n1, n2 = pct_range_match.group(1), pct_range_match.group(2)
            if n1 not in verified_strings and not any(abs(float(n1) - vf) < 0.05 for vf in verified_floats):
                return False
            if n2 not in verified_strings and not any(abs(float(n2) - vf) < 0.05 for vf in verified_floats):
                return False

        # Check for threshold operators like <=16 or >=50
        thresh_match = re.search(r"(?:<=|>=|<|>)\s*(\d+(?:\.\d+)?)", norm)
        if thresh_match:
            nthresh = thresh_match.group(1)
            if nthresh not in verified_strings and not any(abs(float(nthresh) - vf) < 0.05 for vf in verified_floats):
                return False

        # Check for verbal fraction/ratio approximations like "2 out of every 5" or "1 out of 3"
        if re.search(r"\b(?:\d+|one|two|three|four|five)\s+out\s+of\s+(?:every\s+)?(?:\d+|one|two|three|four|five)\b", norm, re.IGNORECASE):
            if not re.search(r"\bout\s+of\b", trace_blob, re.IGNORECASE):
                return False

        # In recommendations, reject numeric targets or thresholds unless verified
        is_rec_sentence = any(k in s.lower() for k in ["recommend", "target", "threshold", "ceiling", "buffer", "rebalance", "reduce risk", "below "])
        if is_rec_sentence:
            rec_nums = re.findall(r"\b\d+(?:\.\d+)?%?", norm)
            for rn in rec_nums:
                cn = rn.replace(",", "").rstrip("%")
                if cn not in verified_strings and not any(abs(float(cn) - vf) < 0.05 for vf in verified_floats if cn.replace(".", "", 1).isdigit()):
                    return False

        raw_nums = re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\b\d+(?:\.\d+)?%?", norm)
        for r in raw_nums:
            clean_num = r.replace(",", "").rstrip("%")
            if not r.endswith("%") and clean_num in ("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "2026", "2027"):
                continue
            if clean_num in verified_strings:
                continue
            try:
                v = float(clean_num)
                if any(abs(v - vf) < 0.05 for vf in verified_floats):
                    continue
                if any(abs(v * 1e6 - vf) < 50000 or abs(v - vf / 1e6) < 0.05 for vf in verified_floats):
                    continue
            except ValueError:
                pass
            return False
        return True

    lines = answer_text.split("\n")
    cleaned_lines = []
    for line in lines:
        if line.strip().startswith("|") and line.strip().endswith("|"):
            if _sentence_is_valid(line):
                cleaned_lines.append(line)
        elif line.strip().startswith(("#", "-", "*", ">")):
            if _sentence_is_valid(line):
                cleaned_lines.append(line)
        else:
            sentences = re.split(r"(?<=[.!?])\s+", line)
            valid_sents = [s for s in sentences if _sentence_is_valid(s)]
            if valid_sents:
                cleaned_lines.append(" ".join(valid_sents))

    return "\n".join(cleaned_lines)


def build_partial_timeout_answer(
    question: str,
    traces: list[dict[str, Any]],
    consulted_agents: list[str] | None = None,
    timed_out_agents: list[str] | None = None,
    model: BaseChatModel | None = None,
    tracker: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Construct a grounded partial response when a timeout occurs with partial tool outputs."""
    import json
    real_traces = [
        t for t in traces
        if not t.get("tool", "").startswith("ask_") and t.get("ok") and t.get("output")
    ]

    domain_label_map = {
        "attendance": "Attendance",
        "workforce_planning": "Workforce planning",
        "planning": "Workforce planning",
        "overtime": "Overtime",
        "attrition": "Attrition",
        "skill": "Skill",
        "skills": "Skill",
        "vendor": "Vendor",
        "production": "Production",
    }

    missing_labels = []
    if timed_out_agents:
        for a in timed_out_agents:
            lbl = domain_label_map.get(a.lower(), a.replace("_", " ").title())
            if lbl not in missing_labels:
                missing_labels.append(lbl)

    if not missing_labels:
        q_lower = question.lower()
        for k, v in domain_label_map.items():
            if k in q_lower:
                has_k = any(k in t.get("tool", "").lower() for t in real_traces)
                if not has_k and v not in missing_labels:
                    missing_labels.append(v)

    if missing_labels:
        missing_note = f"{' and '.join(missing_labels)} data could not be retrieved in time."
    else:
        missing_note = "Remaining workforce domain data could not be retrieved in time."

    if not real_traces:
        return {
            "answer": "I'm sorry, but the Central Workforce Intelligence Assistant is temporarily unavailable. Please try your request again in a few moments.",
            "direct_answer": "Assistant temporarily unavailable.",
            "partial_reason": missing_note,
            "is_partial": False,
            "status": "unavailable",
            "selected_agents": consulted_agents or [],
            "real_traces": [],
            "tool_trace": [],
            "llm_calls": tracker.get("llm_calls", []) if tracker else [],
        }

    # Attempt short LLM call with a 15-second cap
    synthesized_text = None
    if model is None:
        try:
            from app.agents.central_agent_orchestrator import _get_active_chat_model
            model = _get_active_chat_model()
        except Exception:
            model = None

    if model is not None:
        try:
            import concurrent.futures
            from langchain_core.messages import HumanMessage, SystemMessage

            data_summary = []
            for t in real_traces:
                data_summary.append({
                    "tool": t.get("tool"),
                    "output": t.get("output"),
                })
            data_blob = json.dumps(data_summary, default=str)
            if len(data_blob) > 4000:
                data_blob = data_blob[:4000] + "... [truncated]"

            sys_msg = (
                "You are the Central Workforce Intelligence Assistant synthesizing a partial response due to a system timeout.\n"
                f"Notice to include: '{missing_note}'\n"
                "Rules:\n"
                "1. Answer the question using ONLY the provided verified data.\n"
                "2. Clearly state which part is missing upfront or in a notice.\n"
                "3. Keep the answer concise (2-3 short paragraphs max).\n"
                "4. Never invent or extrapolate numbers."
            )
            user_msg = f"Question: {question}\n\nAvailable Verified Data:\n{data_blob}"

            t_llm0 = time.perf_counter()
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                fut = pool.submit(model.invoke, [SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
                llm_res = fut.result(timeout=15.0)

            dur_ms = round((time.perf_counter() - t_llm0) * 1000, 1)
            ans = getattr(llm_res, "content", str(llm_res))
            if ans and len(ans.strip()) > 20:
                synthesized_text = ans.strip()
                if tracker is not None and "llm_calls" in tracker:
                    tracker["llm_calls"].append({
                        "agent": "supervisor_partial_synthesis",
                        "step": "partial",
                        "duration_ms": dur_ms,
                        "prompt_chars": len(sys_msg) + len(user_msg),
                        "response_chars": len(synthesized_text),
                    })
        except Exception as exc:
            logger.warning("Short LLM partial synthesis failed or timed out: %s. Using deterministic summary.", exc)

    if not synthesized_text:
        summary_lines = [
            f"**Notice: Partial Analysis** — {missing_note}",
            "",
            "Here is the verified data available from successfully completed domain queries:",
            "",
        ]
        for t in real_traces:
            tname = t.get("tool", "tool")
            out = t.get("output", {})
            summary_lines.append(f"### {tname.replace('_', ' ').title()}")
            if isinstance(out, dict):
                metrics = out.get("metrics", {})
                if metrics:
                    summary_lines.append("| Metric | Value |")
                    summary_lines.append("| :--- | :--- |")
                    for mk, mv in list(metrics.items())[:6]:
                        summary_lines.append(f"| **{mk.replace('_', ' ').title()}** | `{mv}` |")
                    summary_lines.append("")
                findings = out.get("findings", [])
                if findings:
                    summary_lines.append("**Key Findings:**")
                    for f in findings[:2]:
                        summary_lines.append(f"- {f.get('title')}: {f.get('metric', '')}")
                    summary_lines.append("")
        synthesized_text = "\n".join(summary_lines)

    return {
        "answer": synthesized_text,
        "direct_answer": synthesized_text.split("\n")[0],
        "partial_reason": missing_note,
        "is_partial": True,
        "status": "partial",
        "selected_agents": consulted_agents or [],
        "real_traces": real_traces,
        "tool_trace": real_traces,
        "llm_calls": tracker.get("llm_calls", []) if tracker else [],
    }


def run_supervisor(
    question: str,
    history: list[BaseMessage] | None = None,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    max_steps: int = 4,
    total_timeout: float | None = None,
    llm_timeout: float | None = None,
    deadline: float | None = None,
    cancel_event: threading.Event | None = None,
    tracker: dict[str, Any] | None = None,
    return_direct_if_single_tool: bool | None = None,
) -> dict[str, Any]:
    """Execute the multi-agent supervisor orchestrating domain specialists.

    Args:
        question: User query string.
        history: Prior conversation messages.
        on_event: Lifecycle event callback.
        model: Optional chat model override.
        max_steps: Max iterations for supervisor reasoning (default 4).
        total_timeout: Overall timeout in seconds.
        llm_timeout: Per-LLM-call timeout in seconds.
        deadline: Optional absolute perf_counter deadline.

    Returns:
        dict with {answer, tool_trace, steps, selected_agents, llm_calls}.
    """
    is_cross = detect_cross_domain(question)

    if total_timeout is None:
        try:
            from app.core.config import get_settings
            settings = get_settings()
            if is_cross:
                total_timeout = float(os.getenv("AGENT_CROSS_DOMAIN_TIMEOUT_SEC", str(settings.agent_cross_domain_timeout_sec)))
            else:
                total_timeout = float(os.getenv("AGENT_TOTAL_TIMEOUT_SEC", str(settings.agent_total_timeout_sec)))
        except Exception:
            total_timeout = 100.0 if is_cross else 60.0

    if llm_timeout is None:
        try:
            from app.core.config import get_settings
            llm_timeout = float(os.getenv("AGENT_LLM_TIMEOUT_SEC", str(get_settings().agent_llm_timeout_sec)))
        except Exception:
            llm_timeout = 30.0

    t_start = time.perf_counter()
    if deadline is None:
        deadline = t_start + total_timeout

    if cancel_event is None:
        cancel_event = threading.Event()

    if return_direct_if_single_tool is None:
        return_direct_if_single_tool = not is_cross

    # Initialize context tracking for this supervisor execution
    token_ev = _current_on_event.set(on_event)
    token_model = _current_model.set(model)
    traces_accumulator: list[dict[str, Any]] = []
    agents_accumulator: list[str] = []
    llm_calls_accumulator: list[dict[str, Any]] = []
    timed_out_accumulator: list[str] = []

    if tracker is not None:
        tracker["tool_trace"] = traces_accumulator
        tracker["llm_calls"] = llm_calls_accumulator

    token_traces = _collected_traces.set(traces_accumulator)
    token_agents = _consulted_agents.set(agents_accumulator)
    token_deadline = _current_deadline.set(deadline)
    token_llm_timeout = _current_llm_timeout.set(llm_timeout)
    token_cancel = _current_cancel_event.set(cancel_event)
    token_llm_calls = _collected_llm_calls.set(llm_calls_accumulator)
    token_start_t = _supervisor_start_time.set(t_start)
    token_timed_out = _timed_out_agents.set(timed_out_accumulator)
    token_is_cross = _is_cross_domain_run.set(is_cross)

    try:
        sup_result = run_tool_agent(
            system_prompt=SUPERVISOR_SYSTEM_PROMPT,
            tools=SUPERVISOR_TOOLS,
            history=history,
            user_input=question,
            max_steps=max_steps,
            on_event=on_event,
            model=model,
            total_timeout=total_timeout,
            llm_timeout=llm_timeout,
            deadline=deadline,
            agent_name="supervisor",
            return_direct_if_single_tool=return_direct_if_single_tool,
            cancel_event=cancel_event,
        )

        all_traces = list(traces_accumulator)
        # Include any supervisor-level tool calls in trace if not already present
        for t in sup_result.get("tool_trace", []):
            if t not in all_traces:
                all_traces.append(t)

        for c in sup_result.get("llm_calls", []):
            if c not in llm_calls_accumulator:
                llm_calls_accumulator.append(c)

        consulted = list(dict.fromkeys(agents_accumulator))

        ans_text = sup_result.get("answer", "")
        has_real_tools = any(
            t.get("ok")
            and (
                not t.get("tool", "").startswith("ask_")
                or (isinstance(t.get("output"), dict) and t.get("output", {}).get("tool_trace"))
            )
            for t in all_traces
        )
        if not has_real_tools and _contains_ungrounded_metrics(ans_text):
            logger.warning("[GUARD] Hallucinated metrics detected with zero successful tools. Replacing answer.")
            ans_text = (
                "The requested workforce data is not available without consulting the verified shopfloor database. "
                "Please specify the plant, shift, or date range so the appropriate specialist agent can retrieve the verified records."
            )
        elif has_real_tools:
            ans_text = filter_unverified_sentences(ans_text, all_traces, question)

        return {
            "answer": ans_text,
            "tool_trace": all_traces,
            "steps": sup_result.get("steps", 1),
            "selected_agents": consulted,
            "llm_calls": list(llm_calls_accumulator),
            "is_partial": False,
            "partial_reason": None,
        }
    finally:
        _current_on_event.reset(token_ev)
        _current_model.reset(token_model)
        _collected_traces.reset(token_traces)
        _consulted_agents.reset(token_agents)
        _current_deadline.reset(token_deadline)
        _current_llm_timeout.reset(token_llm_timeout)
        _current_cancel_event.reset(token_cancel)
        _collected_llm_calls.reset(token_llm_calls)
        _supervisor_start_time.reset(token_start_t)
        _timed_out_agents.reset(token_timed_out)
        _is_cross_domain_run.reset(token_is_cross)


__all__ = [
    "AgentSpec",
    "SPECIALISTS",
    "SUPERVISOR_TOOLS",
    "SUPERVISOR_SYSTEM_PROMPT",
    "run_specialist",
    "run_supervisor",
    "detect_cross_domain",
    "build_partial_timeout_answer",
    "_contains_ungrounded_metrics",
    "filter_unverified_sentences",
    "ask_attendance_agent",
    "ask_workforce_planning_agent",
    "ask_overtime_agent",
    "ask_attrition_agent",
    "ask_skill_agent",
    "ask_vendor_agent",
    "ask_production_agent",
]

