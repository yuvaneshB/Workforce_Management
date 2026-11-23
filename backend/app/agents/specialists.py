"""Specialist Agents and Supervisor Coordinator for Central Workforce Intelligence (Phase 7.3).

Implements:
1. AgentSpec: Declarative specification for the 7 workforce domain specialists.
2. run_specialist: Executes a specific domain specialist using run_tool_agent.
3. Supervisor Agent: Oversees the 7 specialists via ask_<agent>_agent tools,
   routing single or multi-domain queries, handling ambiguity, and synthesizing answers.
"""

import contextvars
import logging
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
4. Maintain strict read-only governance without modifying vendor contracts or reassigning workers.
5. Provide actionable decision support for Procurement, Plant HR, and Operations Leaders.
"""


@dataclass
class AgentSpec:
    """Specification of an operational workforce specialist agent."""

    id: str
    name: str
    system_prompt: str
    tools: list[BaseTool]


SPECIALISTS: dict[str, AgentSpec] = {
    "attendance": AgentSpec(
        id="attendance",
        name="Attendance Intelligence Specialist",
        system_prompt=ATTENDANCE_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("attendance", []),
    ),
    "workforce_planning": AgentSpec(
        id="workforce_planning",
        name="Workforce Planning Specialist",
        system_prompt=WORKFORCE_PLANNING_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("workforce_planning", []),
    ),
    "overtime": AgentSpec(
        id="overtime",
        name="Overtime Optimization Specialist",
        system_prompt=OVERTIME_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("overtime", []),
    ),
    "attrition": AgentSpec(
        id="attrition",
        name="Attrition & Retention Specialist",
        system_prompt=ATTRITION_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("attrition", []),
    ),
    "skill": AgentSpec(
        id="skill",
        name="Skill & Training Specialist",
        system_prompt=SKILL_TRAINING_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("skill", []),
    ),
    "vendor": AgentSpec(
        id="vendor",
        name="Vendor Workforce Specialist",
        system_prompt=VENDOR_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("vendor", []),
    ),
    "production": AgentSpec(
        id="production",
        name="Production Workforce Specialist",
        system_prompt=PRODUCTION_AGENT_SYSTEM_PROMPT,
        tools=AGENT_TOOLSETS.get("production", []),
    ),
}

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


def run_specialist(
    agent_id: str,
    question: str,
    history: list[BaseMessage] | None = None,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    max_steps: int = 6,
) -> dict[str, Any]:
    """Execute a specific domain specialist using run_tool_agent.

    Args:
        agent_id: Domain identifier ('attendance', 'workforce_planning', etc.).
        question: Specific user or supervisor question.
        history: Prior conversation messages.
        on_event: Lifecycle event callback for tool start/end.
        model: Optional chat model override.
        max_steps: Max tool iterations for this specialist.

    Returns:
        dict with {answer, tool_trace, steps}.
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

    def _specialist_event_wrapper(ev: dict[str, Any]) -> None:
        if on_event:
            ev_tagged = dict(ev)
            ev_tagged["specialist_id"] = spec.id
            ev_tagged["specialist_name"] = spec.name
            on_event(ev_tagged)

    res = run_tool_agent(
        system_prompt=spec.system_prompt,
        tools=spec.tools,
        history=history,
        user_input=question,
        max_steps=max_steps,
        on_event=_specialist_event_wrapper if on_event else None,
        model=model,
    )
    return res


# =============================================================================
# Supervisor Specialist Delegation Tools
# =============================================================================

class SpecialistQuestionArgs(BaseModel):
    question: str = Field(
        description="Clear, specific natural language workforce question to dispatch to the specialist agent."
    )


def _invoke_specialist_and_track(agent_id: str, question: str) -> dict[str, Any]:
    """Internal helper to execute a specialist and record trace in supervisor context."""
    ev_callback = _current_on_event.get()
    model = _current_model.get()

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

    res = run_specialist(
        agent_id=agent_id,
        question=question,
        history=None,
        on_event=ev_callback,
        model=model,
    )

    t_trace = res.get("tool_trace") or []
    traces_list.extend(t_trace)

    return {
        "answer": res.get("answer", ""),
        "tool_trace": t_trace,
    }


@tool(args_schema=SpecialistQuestionArgs)
def ask_attendance_agent(question: str) -> dict[str, Any]:
    """Consult the Attendance Specialist on absenteeism rates, present counts, late arrivals, streaks, and plant/shift attendance."""
    return _invoke_specialist_and_track("attendance", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_workforce_planning_agent(question: str) -> dict[str, Any]:
    """Consult the Workforce Planning Specialist on shift shortages against the 30-person baseline, headcount availability, and replacements."""
    return _invoke_specialist_and_track("workforce_planning", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_overtime_agent(question: str) -> dict[str, Any]:
    """Consult the Overtime Specialist on overtime hours, labor premiums, 50 hr/mo statutory limit breaches, and worker fatigue."""
    return _invoke_specialist_and_track("overtime", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_attrition_agent(question: str) -> dict[str, Any]:
    """Consult the Attrition Specialist on employee turnover rates, exit reasons/drivers, early-tenure vulnerability, and resignation hotspots."""
    return _invoke_specialist_and_track("attrition", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_skill_agent(question: str) -> dict[str, Any]:
    """Consult the Skill & Training Specialist on employee proficiency levels (L1-L4), skill matrix shortages, dependencies, and certifications."""
    return _invoke_specialist_and_track("skill", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_vendor_agent(question: str) -> dict[str, Any]:
    """Consult the Vendor Workforce Specialist on contractor agency headcounts, partner share across V01-V06, vendor SLAs, and contractor reliance."""
    return _invoke_specialist_and_track("vendor", question)


@tool(args_schema=SpecialistQuestionArgs)
def ask_production_agent(question: str) -> dict[str, Any]:
    """Consult the Production Specialist on actual vs target manufacturing units, line efficiency, downtime minutes, and scrap impacts."""
    return _invoke_specialist_and_track("production", question)


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
2. ask_workforce_planning_agent: Headcount availability, shift staffing shortages against the 30-person baseline, candidate replacements.
3. ask_overtime_agent: Overtime hours, labor premiums, statutory 50 hr/mo limit breaches, worker fatigue.
4. ask_attrition_agent: Employee turnover rates, exit drivers/reasons, tenure vulnerability, department resignation hotspots.
5. ask_skill_agent: Skill proficiency grades (L1-L4), skill matrix shortages, single-operator dependencies, training compliance.
6. ask_vendor_agent: Contractor headcounts, agency share across the 6 staffing partners (V01-V06), vendor SLAs.
7. ask_production_agent: Planned target vs actual output units, line efficiency, downtime minutes, scrap impacts.

Operating Directives:
1. Question Understanding & Agent Selection:
   - Carefully interpret the user's intent, date window, plant ('IN-KA-01' or 'IN-TN-01'), and shift ('A', 'B', 'C').
   - Pick ONE OR MORE specialist agents to consult depending on the user question.
   - For cross-domain or comparative questions (e.g. "Does overtime correlate with absenteeism?", "Compare production and staffing in Shift B"), invoke multiple specialist agents.
2. Ambiguity Handling:
   - If a question is genuinely ambiguous and cannot be grounded without knowing the evaluation criteria (e.g. "Who is the best employee?" without criteria), ask for clarification directly rather than guessing.
3. Grounding & Zero Hallucination:
   - NEVER invent, simulate, or fabricate numbers, employee names, rates, or dates.
   - Base your final response strictly and solely on the verified answers and data returned by the specialist agents.
4. Synthesis & Communication:
   - Reply in natural, clear, executive-ready prose (typically 3 to 6 sentences or concise bullet points).
   - State the factual findings clearly with verified numbers.
   - Conclude with the single most actionable recommendation.
   - Do NOT output raw JSON to the user unless specifically requested.
"""


def run_supervisor(
    question: str,
    history: list[BaseMessage] | None = None,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    model: BaseChatModel | None = None,
    max_steps: int = 6,
) -> dict[str, Any]:
    """Execute the multi-agent supervisor orchestrating domain specialists.

    Args:
        question: User query string.
        history: Prior conversation messages.
        on_event: Lifecycle event callback.
        model: Optional chat model override.
        max_steps: Max iterations for supervisor reasoning.

    Returns:
        dict with {answer, tool_trace, steps, selected_agents}.
    """
    # Initialize context tracking for this supervisor execution
    token_ev = _current_on_event.set(on_event)
    token_model = _current_model.set(model)
    traces_accumulator: list[dict[str, Any]] = []
    agents_accumulator: list[str] = []
    token_traces = _collected_traces.set(traces_accumulator)
    token_agents = _consulted_agents.set(agents_accumulator)

    try:
        sup_result = run_tool_agent(
            system_prompt=SUPERVISOR_SYSTEM_PROMPT,
            tools=SUPERVISOR_TOOLS,
            history=history,
            user_input=question,
            max_steps=max_steps,
            on_event=on_event,
            model=model,
        )

        all_traces = list(traces_accumulator)
        # Include any supervisor-level tool calls in trace if not already present
        for t in sup_result.get("tool_trace", []):
            if t not in all_traces:
                all_traces.append(t)

        consulted = list(dict.fromkeys(agents_accumulator))

        return {
            "answer": sup_result.get("answer", ""),
            "tool_trace": all_traces,
            "steps": sup_result.get("steps", 1),
            "selected_agents": consulted,
        }
    finally:
        _current_on_event.reset(token_ev)
        _current_model.reset(token_model)
        _collected_traces.reset(token_traces)
        _consulted_agents.reset(token_agents)


__all__ = [
    "AgentSpec",
    "SPECIALISTS",
    "SUPERVISOR_TOOLS",
    "SUPERVISOR_SYSTEM_PROMPT",
    "run_specialist",
    "run_supervisor",
    "ask_attendance_agent",
    "ask_workforce_planning_agent",
    "ask_overtime_agent",
    "ask_attrition_agent",
    "ask_skill_agent",
    "ask_vendor_agent",
    "ask_production_agent",
]

