"""Workforce Planning LangChain tools (Phase 4).

Wraps the validated Phase 2 & Phase 3 workforce planning service:
1. get_workforce_shortage: Detect date-specific workforce shortages against the 30-person operational baseline.
2. get_shift_workforce_availability: Calculate date-specific availability distinguishing PRESENT, ABSENT, LEAVE, LATE.
3. recommend_replacement_employees: Deterministically filter, score, and rank eligible replacement candidates.
"""

import datetime as dt
import logging
from typing import Any

from langchain_core.tools import tool

from app.agents.tools.workforce_tools import _get_tool_db_session, tool_registry
from app.core.data_mapping import get_all_valid_plant_ids
from app.services import workforce_planning_service

logger = logging.getLogger(__name__)

DEFAULT_OPERATIONAL_DATE = dt.date(2026, 8, 1)

VALID_PLANTS = get_all_valid_plant_ids()
VALID_SHIFTS = {"A", "B", "C"}


def _resolve_planning_date(val: str | dt.date | None) -> dt.date:
    """Safely parse or default the target planning date."""
    if val is None:
        return DEFAULT_OPERATIONAL_DATE
    if isinstance(val, dt.date):
        return val
    if isinstance(val, str):
        clean = val.strip().lower()
        if not clean or clean == "today":
            return DEFAULT_OPERATIONAL_DATE
        try:
            return dt.date.fromisoformat(clean)
        except ValueError:
            raise ValueError(f"Invalid date format: '{val}'. Expected YYYY-MM-DD format.")
    return DEFAULT_OPERATIONAL_DATE


def _normalize_shift_id(shift_id: str | None) -> str | None:
    """Normalize shift identifiers (A/GS1, B/S2, C/NS3)."""
    if not shift_id or not shift_id.strip():
        return None
    clean = shift_id.strip().upper()
    mapping = {
        "GS1": "A",
        "S2": "B",
        "NS3": "C",
        "SHIFT A": "A",
        "SHIFT B": "B",
        "SHIFT C": "C",
        "A": "A",
        "B": "B",
        "C": "C",
    }
    return mapping.get(clean, clean)


def _normalize_plant_id(plant_id: str | None) -> str | None:
    """Normalize plant identifiers."""
    if not plant_id or not plant_id.strip():
        return None
    clean = plant_id.strip().upper()
    mapping = {
        "TN": "IN-TN-01",
        "KA": "IN-KA-01",
        "IN-TN": "IN-TN-01",
        "IN-KA": "IN-KA-01",
        "PLANT 1": "IN-TN-01",
        "PLANT1": "IN-TN-01",
        "PLANT 2": "IN-TN-02",
        "PLANT2": "IN-TN-02",
        "IN-TN-01": "IN-TN-01",
        "IN-TN-02": "IN-TN-02",
        "IN-KA-01": "IN-KA-01",
    }
    return mapping.get(clean, clean)


def _normalize_department_id(dept_id: str | None) -> str | None:
    """Normalize department names or IDs to standard DEPT codes."""
    if not dept_id or not dept_id.strip():
        return None
    clean = dept_id.strip().upper()
    mapping = {
        "PRODUCTION": "DEPT-01",
        "MAINTENANCE": "DEPT-02",
        "QUALITY": "DEPT-03",
        "OPERATIONS": "DEPT-04",
        "ENGINEERING": "DEPT-05",
        "WAREHOUSE": "DEPT-06",
        "DEPT-01": "DEPT-01",
        "DEPT-02": "DEPT-02",
        "DEPT-03": "DEPT-03",
        "DEPT-04": "DEPT-04",
        "DEPT-05": "DEPT-05",
        "DEPT-06": "DEPT-06",
    }
    return mapping.get(clean, clean)


def _normalize_section_id(sec_id: str | None) -> str | None:
    """Normalize section names or IDs to standard SEC codes."""
    if not sec_id or not sec_id.strip():
        return None
    clean = sec_id.strip().upper()
    mapping = {
        "SMT PRODUCTION": "SEC-01",
        "MANUAL INSERTION": "SEC-02",
        "MECHANICAL ASSEMBLY": "SEC-03",
        "FINAL ASSEMBLY": "SEC-04",
        "TESTING & QC": "SEC-05",
        "PACKAGING": "SEC-06",
        "SEC-01": "SEC-01",
        "SEC-02": "SEC-02",
        "SEC-03": "SEC-03",
        "SEC-04": "SEC-04",
        "SEC-05": "SEC-05",
        "SEC-06": "SEC-06",
    }
    return mapping.get(clean, clean)


@tool
def get_workforce_shortage(
    date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve date-specific workforce shortage information against the verified 30-person operational baseline.

    Args:
        date: Target date in YYYY-MM-DD format (defaults to current operational date '2026-08-01' if omitted or 'today').
        plant_id: Optional plant identifier ('IN-TN-01' or 'IN-KA-01').
        shift_id: Optional shift identifier ('A'/'GS1', 'B'/'S2', 'C'/'NS3').

    Returns:
        Required baseline, available workforce, shortage count, shortage percentage, severity (OPTIMAL/LOW/MODERATE/CRITICAL),
        absent/leave/late counts, role-specific shortages, scheduled teams, and limitations.
    """
    try:
        target_date = _resolve_planning_date(date)
        clean_plant = _normalize_plant_id(plant_id)
        clean_shift = _normalize_shift_id(shift_id)

        if clean_plant and clean_plant not in VALID_PLANTS:
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
            }
        if clean_shift and clean_shift not in VALID_SHIFTS:
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
            }

        with _get_tool_db_session() as session:
            result = workforce_planning_service.detect_workforce_shortages(
                session,
                target_date=target_date,
                plant_id=clean_plant,
                shift_id=clean_shift,
            )

            return {
                "status": "success",
                "date": result["date"],
                "plant_id": result["plant_id"],
                "shift_id": result["shift_id"],
                "baseline_scope": result["baseline_scope"],
                "required_baseline": result["required_baseline"],
                "available_workforce": result["available_workforce"],
                "shortage_count": result["shortage_count"],
                "shortage_percentage": result["shortage_percentage"],
                "severity": result["severity"],
                "absent_count": result["absent_count"],
                "leave_count": result["leave_count"],
                "late_count": result["late_count"],
                "calculation_explanation": result["calculation_explanation"],
                "role_shortages": result["role_shortages"],
                "team_composition_validated": result["team_composition_validated"],
                "scheduled_teams": result["scheduled_teams"],
                "limitations": result["limitations"],
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        logger.error("Error in get_workforce_shortage: %s", err)
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve workforce shortage data: {str(err)}",
        }


@tool
def get_shift_workforce_availability(
    date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve date-specific workforce availability breakdown distinguishing PRESENT, ABSENT, LEAVE, and LATE statuses.

    Args:
        date: Target date in YYYY-MM-DD format (defaults to current operational date '2026-08-01' if omitted or 'today').
        plant_id: Optional plant identifier ('IN-TN-01', 'IN-KA-01').
        shift_id: Optional shift identifier ('A'/'GS1', 'B'/'S2', 'C'/'NS3').
        department_id: Optional department name or ID (e.g. 'Production' or 'DEPT-01').
        section_id: Optional section name or ID (e.g. 'SMT Production' or 'SEC-01').

    Returns:
        Total scheduled, present count, absent count, leave count, late count, immediately available count,
        potential total with late, availability rate, absenteeism rate, breakdowns by role, shift, and plant.
    """
    try:
        target_date = _resolve_planning_date(date)
        clean_plant = _normalize_plant_id(plant_id)
        clean_shift = _normalize_shift_id(shift_id)
        clean_dept = _normalize_department_id(department_id)
        clean_sec = _normalize_section_id(section_id)

        if clean_plant and clean_plant not in VALID_PLANTS:
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
            }
        if clean_shift and clean_shift not in VALID_SHIFTS:
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
            }

        with _get_tool_db_session() as session:
            result = workforce_planning_service.calculate_workforce_availability(
                session,
                target_date=target_date,
                plant_id=clean_plant,
                shift_id=clean_shift,
                department_id=clean_dept,
                section_id=clean_sec,
            )

            return {
                "status": "success",
                "date": result["date"],
                "plant_id": result["plant_id"],
                "shift_id": result["shift_id"],
                "department_id": result["department_id"],
                "section_id": result["section_id"],
                "total_scheduled": result["total_scheduled"],
                "present_count": result["present_count"],
                "absent_count": result["absent_count"],
                "leave_count": result["leave_count"],
                "late_count": result["late_count"],
                "available_count": result["available_count"],
                "potential_total_with_late": result["potential_total_with_late"],
                "availability_rate": result["availability_rate"],
                "absenteeism_rate": result["absenteeism_rate"],
                "late_policy": result["late_policy"],
                "by_role": result["by_role"],
                "by_shift": result["by_shift"],
                "by_plant": result["by_plant"],
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        logger.error("Error in get_shift_workforce_availability: %s", err)
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve workforce availability: {str(err)}",
        }


@tool
def recommend_replacement_employees(
    employee_id: str,
    date: str | None = None,
    target_shift: str | None = None,
    mandatory_certification: bool = True,
) -> dict[str, Any]:
    """Identify, filter, score, and rank eligible replacement candidates for an absent worker.

    Enforces mandatory operational constraints:
    1. Exact role match
    2. Same-plant isolation (no inter-plant transfers)
    3. Active employee status
    4. Candidate not absent or on leave on target date
    5. No target shift conflict
    6. Minimum 8-hour shift rest turnaround (consecutive back-to-back shifts strictly disqualified)
    7. Candidate skill grade >= absent employee skill grade
    8. Active training compliance (CURRENT)
    9. Mandatory certification match by default (unrelated certifications disqualified)

    Args:
        employee_id: The ID of the absent employee (e.g. 'EMP-0018', 'EMP-0048').
        date: Target date in YYYY-MM-DD format (defaults to current operational date '2026-08-01' if omitted or 'today').
        target_shift: Optional target shift ('A'/'GS1', 'B'/'S2', 'C'/'NS3').
        mandatory_certification: Whether to require exact certification match (default True).

    Returns:
        Absent employee profile, eligible candidates ranked by score, disqualified candidate reasons,
        and operational message.
    """
    try:
        if not employee_id or not employee_id.strip():
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": "employee_id is required.",
            }

        clean_emp_id = employee_id.strip().upper()
        target_date = _resolve_planning_date(date)
        clean_shift = _normalize_shift_id(target_shift)

        if clean_shift and clean_shift not in VALID_SHIFTS:
            return {
                "status": "error",
                "error_type": "ValidationError",
                "message": f"Invalid target_shift '{target_shift}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
            }

        with _get_tool_db_session() as session:
            result = workforce_planning_service.recommend_replacement_candidates(
                session,
                absent_employee_id=clean_emp_id,
                target_date=target_date,
                target_shift=clean_shift,
                mandatory_certification=mandatory_certification,
            )

            if result.get("absent_employee") is None:
                return {
                    "status": "error",
                    "error_type": "NotFoundError",
                    "message": f"Employee '{clean_emp_id}' not found.",
                }

            return {
                "status": "success",
                "target_date": result["target_date"],
                "target_shift": result["target_shift"],
                "mandatory_certification": result.get("mandatory_certification", mandatory_certification),
                "absent_employee": result["absent_employee"],
                "eligible_candidates_count": result["eligible_candidates_count"],
                "disqualified_candidates_count": result["disqualified_candidates_count"],
                "candidates": result["candidates"],
                "disqualified_summary": result["disqualified_summary"],
                "message": result["message"],
                "limitations": result["limitations"],
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        logger.error("Error in recommend_replacement_employees: %s", err)
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to recommend replacement candidates: {str(err)}",
        }


# Register the 3 workforce planning tools into the central tool registry
tool_registry.register_tool(get_workforce_shortage)
tool_registry.register_tool(get_shift_workforce_availability)
tool_registry.register_tool(recommend_replacement_employees)

