"""Prompt templates for Workforce Management Agent."""

from app.agents.prompts.planning_prompt import (
    WORKFORCE_PLANNING_SYSTEM_PROMPT,
    get_planning_prompt_template,
)
from app.agents.prompts.workforce_prompt import (
    WORKFORCE_SYSTEM_PROMPT,
    get_workforce_prompt_template,
)

__all__ = [
    "WORKFORCE_PLANNING_SYSTEM_PROMPT",
    "WORKFORCE_SYSTEM_PROMPT",
    "get_planning_prompt_template",
    "get_workforce_prompt_template",
]

