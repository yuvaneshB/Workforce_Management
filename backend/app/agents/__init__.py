"""Workforce Management Agent package."""

from app.agents.agent_service import WorkforceAgentService, agent_service
from app.agents.planning_agent_service import (
    WorkforcePlanningAgentService,
    planning_agent_service,
)
from app.agents.llm.domo_provider import DomoChatModel, create_domo_chat_model
from app.agents.llm.provider import (
    LLMProviderNotConfiguredError,
    get_chat_model,
    is_llm_configured,
    register_llm_provider,
)
from app.agents.memory.conversation_memory import (
    ConversationMemoryManager,
    conversation_memory,
)
from app.agents.prompts.planning_prompt import (
    WORKFORCE_PLANNING_SYSTEM_PROMPT,
    get_planning_prompt_template,
)
from app.agents.prompts.workforce_prompt import (
    WORKFORCE_SYSTEM_PROMPT,
    get_workforce_prompt_template,
)
from app.agents.tools.planning_tools import (
    get_shift_workforce_availability,
    get_workforce_shortage,
    recommend_replacement_employees,
)
from app.agents.tools.workforce_tools import (
    WorkforceToolRegistry,
    get_attendance_analytics,
    get_department_analytics,
    get_experience_analytics,
    get_section_analytics,
    get_shift_analytics,
    get_workforce_summary,
    sample_health_tool,
    tool_registry,
)

__all__ = [
    "ConversationMemoryManager",
    "DomoChatModel",
    "LLMProviderNotConfiguredError",
    "WORKFORCE_PLANNING_SYSTEM_PROMPT",
    "WORKFORCE_SYSTEM_PROMPT",
    "WorkforceAgentService",
    "WorkforcePlanningAgentService",
    "WorkforceToolRegistry",
    "agent_service",
    "conversation_memory",
    "create_domo_chat_model",
    "get_attendance_analytics",
    "get_chat_model",
    "get_department_analytics",
    "get_experience_analytics",
    "get_planning_prompt_template",
    "get_section_analytics",
    "get_shift_analytics",
    "get_shift_workforce_availability",
    "get_workforce_prompt_template",
    "get_workforce_shortage",
    "get_workforce_summary",
    "is_llm_configured",
    "planning_agent_service",
    "recommend_replacement_employees",
    "register_llm_provider",
    "sample_health_tool",
    "tool_registry",
]
