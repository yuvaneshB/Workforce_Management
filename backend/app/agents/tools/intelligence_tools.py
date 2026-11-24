"""Workforce Intelligence LangChain tools (Phase 7.1).

Wraps the validated intelligence service:
1. get_single_person_dependency: Analyze single-person dependency risks across plant roles and certifications.
2. get_labour_compliance: Audit workforce attendance for labor compliance, overtime limits, and rest turnaround intervals.
"""

import logging
from typing import Any

from langchain_core.tools import tool

from app.agents.tools.workforce_tools import _get_tool_db_session, tool_registry
from app.services import intelligence_service

logger = logging.getLogger(__name__)


@tool
def get_single_person_dependency(
    plant_id: str | None = None,
    shift_id: str | None = None,
    date: str | None = None,
) -> dict[str, Any]:
    """Analyze single-person dependency risks across plant roles and certifications.

    Identifies skills/roles where available qualified staffing is at or below the backup threshold.
    Useful for answering questions about single points of failure, skill backup risks, or critical personnel bottlenecks.

    Parameters:
    - plant_id: Optional plant code filter ('IN-KA-01', 'IN-TN-01').
    - shift_id: Optional shift filter ('A', 'B', 'C' or 'GS1', 'S2', 'NS3').
    - date: Optional target date in YYYY-MM-DD format (defaults to latest available date).
    """
    try:
        with _get_tool_db_session() as session:
            raw = intelligence_service.get_single_person_dependency(
                session,
                plant_id=plant_id,
                shift_id=shift_id,
                date=date,
            )
            if isinstance(raw, dict) and "rows" in raw:
                raw["total_roles_evaluated"] = raw.get("total_roles_evaluated", len(raw["rows"]))
                raw["top_risk_roles"] = raw["rows"][:3]
                raw["rows"] = raw["rows"][:3]
            return raw
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        logger.error("Error in get_single_person_dependency: %s", err)
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve single-person dependency analysis: {str(err)}",
        }


@tool
def get_labour_compliance(
    plant_id: str | None = None,
    shift_id: str | None = None,
    date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Audit workforce attendance for labor compliance, overtime limits, and rest turnaround intervals.

    Checks daily overtime, weekly working hours against approved policy limits, and verifies minimum
    8-hour rest turnaround intervals between consecutive scheduled shifts.

    Parameters:
    - plant_id: Optional plant code filter ('IN-KA-01', 'IN-TN-01').
    - shift_id: Optional shift filter ('A', 'B', 'C' or 'GS1', 'S2', 'NS3').
    - date: Optional single target date in YYYY-MM-DD format.
    - start_date: Optional window start date in YYYY-MM-DD format.
    - end_date: Optional window end date in YYYY-MM-DD format.
    """
    try:
        with _get_tool_db_session() as session:
            raw = intelligence_service.get_labour_compliance(
                session,
                plant_id=plant_id,
                shift_id=shift_id,
                date=date,
                start_date=start_date,
                end_date=end_date,
            )
            if isinstance(raw, dict) and "exceptions" in raw:
                raw["total_exceptions"] = raw.get("total_exceptions", len(raw["exceptions"]))
                raw["sample_exceptions"] = raw["exceptions"][:3]
                raw["exceptions"] = raw["exceptions"][:3]
            return raw
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        logger.error("Error in get_labour_compliance: %s", err)
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to execute labour compliance audit: {str(err)}",
        }


# Register the 2 intelligence tools in the central tool registry
tool_registry.register_tool(get_single_person_dependency)
tool_registry.register_tool(get_labour_compliance)

