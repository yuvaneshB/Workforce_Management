"""Workforce analytics LangChain tools (Phase 6.2 - Phase 6.4 & Advanced Analytics).

Provides the 11 verified workforce tools wrapping existing database services:
1. get_workforce_summary
2. get_attendance_analytics
3. get_department_analytics
4. get_shift_analytics
5. get_experience_analytics
6. get_section_analytics
7. get_overtime_analytics
8. get_team_production_analytics
9. get_shift_efficiency_analytics
10. get_skills_analytics
11. get_compliance_analytics
"""

import datetime as dt
from contextlib import contextmanager
from typing import Any

from langchain_core.tools import BaseTool, tool
from sqlalchemy.orm import Session

from app.core.database import db_manager
from app.services import (
    attendance_service,
    workforce_analytics_service,
    workforce_service,
)


@contextmanager
def _get_tool_db_session():
    """Context manager acquiring a read-only database session for tool execution."""
    if db_manager.readonly_session_local is None:
        raise RuntimeError("Database connection is not configured.")
    session = db_manager.readonly_session_local()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.rollback()
        session.close()


def _parse_optional_date(val: str | dt.date | None, param_name: str) -> dt.date | None:
    """Safely parse an optional date string or date object into a dt.date."""
    if val is None:
        return None
    if isinstance(val, dt.date):
        return val
    if isinstance(val, str):
        clean = val.strip()
        if not clean:
            return None
        try:
            return dt.date.fromisoformat(clean)
        except ValueError:
            raise ValueError(
                f"Invalid date format for '{param_name}': '{clean}'. Expected YYYY-MM-DD format."
            )
    raise ValueError(f"Expected string or date for '{param_name}', got {type(val).__name__}.")


def _validate_date_window(start: dt.date | None, end: dt.date | None) -> None:
    """Validate that start_date is not after end_date."""
    if start and end and start > end:
        raise ValueError(
            f"start_date ({start.isoformat()}) cannot be after end_date ({end.isoformat()})."
        )


class WorkforceToolRegistry:
    """Central registry for workforce analytics tools."""

    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {}

    def register_tool(self, tool_instance: BaseTool) -> BaseTool:
        """Register a BaseTool instance in the registry."""
        name = getattr(tool_instance, "name", str(tool_instance))
        self._tools[name] = tool_instance
        return tool_instance

    def unregister_tool(self, name: str) -> None:
        """Unregister a tool by name."""
        if name in self._tools:
            del self._tools[name]

    def clear(self) -> None:
        """Clear all registered tools (primarily for testing)."""
        self._tools.clear()

    def get_tool(self, name: str) -> BaseTool | None:
        """Retrieve a registered tool by name."""
        return self._tools.get(name)

    def get_registered_tools(self) -> list[BaseTool]:
        """Return a list of all currently registered BaseTool instances."""
        return list(self._tools.values())

    def get_tool_names(self) -> list[str]:
        """Return the names of all registered tools."""
        return list(self._tools.keys())


# Global singleton tool registry
tool_registry = WorkforceToolRegistry()


@tool
def get_workforce_summary() -> dict[str, Any]:
    """Retrieve high-level workforce metrics including total employees, active employees, and team count.

    Use this tool when answering general questions about workforce size, headcount, or total teams.
    """
    try:
        with _get_tool_db_session() as session:
            summary = workforce_service.get_workforce_summary(session)
            return {
                "status": "success",
                "total_employees": summary.total_employees,
                "active_employees": summary.active_employees,
                "team_count": summary.distinct_teams,
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve workforce summary: {str(err)}",
        }


@tool
def get_attendance_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve aggregated attendance analytics with status counts and percentages.

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Status counts for PRESENT, ABSENT, LEAVE, LATE, total eligible records,
        attendance percentage, and absenteeism percentage.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and shift_id.strip() else None

        with _get_tool_db_session() as session:
            analytics = attendance_service.get_attendance_analytics(
                session,
                period="daily",
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
            )

            # Preserve all 4 statuses separately without classifying LEAVE or LATE as ABSENT
            present_count = 0
            absent_count = 0
            leave_count = 0
            late_count = 0

            for item in analytics.by_status:
                status_name = getattr(item, "attendance_status", "")
                count = getattr(item, "record_count", 0)
                if status_name == "PRESENT":
                    present_count = count
                elif status_name == "ABSENT":
                    absent_count = count
                elif status_name == "LEAVE":
                    leave_count = count
                elif status_name == "LATE":
                    late_count = count

            total_records = analytics.total_records
            att_pct = (
                round((present_count * 100.0 / total_records), 1)
                if total_records > 0
                else 0.0
            )
            abs_pct = (
                round((absent_count * 100.0 / total_records), 1)
                if total_records > 0
                else 0.0
            )

            return {
                "status": "success",
                "total_records": total_records,
                "present_count": present_count,
                "absent_count": absent_count,
                "leave_count": leave_count,
                "late_count": late_count,
                "attendance_percentage": att_pct,
                "absenteeism_percentage": abs_pct,
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve attendance analytics: {str(err)}",
        }


@tool
def get_department_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve department-wise headcounts, attendance counts, and attendance/absenteeism rates.

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Department breakdown with headcount, present count, absent count,
        attendance percentage, and absenteeism percentage for each department.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and shift_id.strip() else None

        with _get_tool_db_session() as session:
            dept_res = workforce_analytics_service.get_department_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
            )

            dept_items = []
            for item in dept_res.items:
                dept_items.append(
                    {
                        "department_id": getattr(item, "department_id", ""),
                        "department_name": getattr(item, "department_name", ""),
                        "headcount": getattr(item, "employee_count", 0),
                        "present_count": getattr(item, "present_count", 0),
                        "absent_count": getattr(item, "absent_count", 0),
                        "attendance_percentage": getattr(item, "attendance_pct", 0.0),
                        "absenteeism_percentage": getattr(item, "absenteeism_pct", 0.0),
                    }
                )

            return {
                "status": "success",
                "total_departments": getattr(dept_res, "total_departments", len(dept_items)),
                "departments": dept_items,
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve department analytics: {str(err)}",
        }


@tool
def get_shift_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve shift-wise analytics including employee headcount, present count, absent count, attendance percentage, and absenteeism percentage.

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Shift breakdown with headcount, present count, absent count,
        attendance percentage, and absenteeism percentage for each shift.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and shift_id.strip() else None

        with _get_tool_db_session() as session:
            summary = workforce_service.get_workforce_summary(session)
            headcount_map = {item.key: item.count for item in summary.by_home_shift}

            att_analytics = attendance_service.get_attendance_analytics(
                session,
                period="daily",
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
            )

            shift_items = []
            for sb in att_analytics.shift_breakdown:
                s_id = getattr(sb, "shift_id", "")
                shift_items.append(
                    {
                        "shift_id": s_id,
                        "headcount": headcount_map.get(s_id, 0),
                        "present_count": getattr(sb, "present_count", 0),
                        "absent_count": getattr(sb, "absent_count", 0),
                        "total_records": getattr(sb, "total_records", 0),
                        "attendance_percentage": getattr(sb, "attendance_pct", 0.0),
                        "absenteeism_percentage": getattr(sb, "absenteeism_pct", 0.0),
                    }
                )

            return {
                "status": "success",
                "total_shifts": len(shift_items),
                "shifts": shift_items,
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve shift analytics: {str(err)}",
        }


@tool
def get_experience_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve employee experience analytics categorized by tenure tiers with attendance and absenteeism rates.

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Experience tiers with employee count, present count, absent count,
        attendance percentage, and absenteeism percentage.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and shift_id.strip() else None

        with _get_tool_db_session() as session:
            exp_res = workforce_analytics_service.get_experience_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
            )

            exp_items = []
            for item in exp_res.items:
                exp_items.append(
                    {
                        "category": getattr(item, "category", ""),
                        "employee_count": getattr(item, "employee_count", 0),
                        "present_count": getattr(item, "present_count", 0),
                        "absent_count": getattr(item, "absent_count", 0),
                        "total_records": getattr(item, "total_records", 0),
                        "attendance_percentage": getattr(item, "attendance_pct", 0.0),
                        "absenteeism_percentage": getattr(item, "absenteeism_pct", 0.0),
                    }
                )

            return {
                "status": "success",
                "total_categories": len(exp_items),
                "experience_tiers": exp_items,
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve experience analytics: {str(err)}",
        }


@tool
def get_section_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve section-wise analytics including employee headcount, present count, absent count, attendance percentage, and absenteeism percentage.

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Section breakdown with headcount, present count, absent count,
        attendance percentage, and absenteeism percentage for each plant section.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and shift_id.strip() else None

        with _get_tool_db_session() as session:
            sec_res = workforce_analytics_service.get_section_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
            )

            sec_items = []
            for item in sec_res.items:
                sec_items.append(
                    {
                        "section_id": getattr(item, "section_id", ""),
                        "section_name": getattr(item, "section_name", ""),
                        "headcount": getattr(item, "employee_count", 0),
                        "present_count": getattr(item, "present_count", 0),
                        "absent_count": getattr(item, "absent_count", 0),
                        "total_records": getattr(item, "total_records", 0),
                        "attendance_percentage": getattr(item, "attendance_pct", 0.0),
                        "absenteeism_percentage": getattr(item, "absenteeism_pct", 0.0),
                    }
                )

            return {
                "status": "success",
                "total_sections": getattr(sec_res, "total_sections", len(sec_items)),
                "sections": sec_items,
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve section analytics: {str(err)}",
        }


@tool
def get_overtime_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve comprehensive overtime analytics including total overtime hours, overtime by shift, department, section, top overtime employees, and trends.

    Use this tool when answering questions about:
    - Overtime hours, records, or rates
    - Which shift, department, or section has the highest/lowest overtime
    - Overtime trends (daily or monthly)
    - Employees with the highest recorded overtime

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').
        department_id: Optional department filter (e.g. 'DEPT-01', 'DEPT-02').
        section_id: Optional section filter (e.g. 'SEC-01', 'SEC-02').
        plant_id: Optional plant ID filter (e.g. 'PLANT-01').

    Returns:
        Structured overtime metrics: total_overtime_hours, total_employees_with_overtime,
        overtime_rate_pct, avg_overtime_hours_per_employee, shift_wise, department_wise,
        section_wise, top overtime employees (employee_wise), and trends.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and isinstance(shift_id, str) and shift_id.strip() else None
        clean_dept = department_id.strip().upper() if department_id and isinstance(department_id, str) and department_id.strip() else None
        clean_sec = section_id.strip() if section_id and isinstance(section_id, str) and section_id.strip() else None
        clean_plant = plant_id.strip().upper() if plant_id and isinstance(plant_id, str) and plant_id.strip() else None

        with _get_tool_db_session() as session:
            result = workforce_analytics_service.get_overtime_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
                department_id=clean_dept,
                section_id=clean_sec,
                plant_id=clean_plant,
            )

            return {
                "status": "success",
                "total_overtime_hours": result.get("total_overtime_hours", 0),
                "total_employees_with_overtime": result.get("total_employees_with_overtime", 0),
                "overtime_record_count": result.get("overtime_record_count", 0),
                "overtime_rate_pct": result.get("overtime_rate_pct", 0.0),
                "avg_overtime_hours_per_employee": result.get("avg_overtime_hours_per_employee", 0.0),
                "shift_wise": result.get("shift_wise", []),
                "department_wise": result.get("department_wise", []),
                "section_wise": result.get("section_wise", []),
                "employee_wise": result.get("employee_wise", []),
                "monthly_trend": result.get("monthly_trend", []),
                "daily_trend": result.get("daily_trend", []),
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                    "department_id": clean_dept,
                    "section_id": clean_sec,
                    "plant_id": clean_plant,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve overtime analytics: {str(err)}",
        }


@tool
def get_team_production_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    operator_team: str | None = None,
) -> dict[str, Any]:
    """Retrieve team-wise production analytics including target vs actual quantities, quality metrics, downtime, achievement percentage, and production per present team employee.

    IMPORTANT: Production is tracked and attributed at the team level (operator_team) and shift level, NEVER to individual employees.

    Use this tool when answering questions about:
    - Team-level production output (target vs actual)
    - Which team has the highest/lowest production or achievement
    - Teams below or above production targets
    - Team downtime and quality metrics (good/reject/rework)
    - Production throughput per present team member

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        plant_id: Optional plant ID filter (e.g. 'PLANT-01').
        shift_id: Optional shift filter ('A', 'B', or 'C').
        operator_team: Optional team name/ID filter (e.g. 'TEAM-01', 'TEAM-02').

    Returns:
        Structured team production metrics: total_target_qty, total_actual_qty, total_good_qty,
        total_reject_qty, total_rework_qty, total_downtime_min, overall_achievement_pct,
        overall_production_per_present_employee, and individual team items breakdown.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_plant = plant_id.strip().upper() if plant_id and isinstance(plant_id, str) and plant_id.strip() else None
        clean_shift = shift_id.strip().upper() if shift_id and isinstance(shift_id, str) and shift_id.strip() else None
        clean_team = operator_team.strip() if operator_team and isinstance(operator_team, str) and operator_team.strip() else None

        with _get_tool_db_session() as session:
            result = workforce_analytics_service.get_team_production_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                plant_id=clean_plant,
                shift_id=clean_shift,
                operator_team=clean_team,
            )

            return {
                "status": "success",
                "total_teams": result.get("total_teams", 0),
                "total_target_qty": result.get("total_target_qty", 0),
                "total_actual_qty": result.get("total_actual_qty", 0),
                "total_good_qty": result.get("total_good_qty", 0),
                "total_reject_qty": result.get("total_reject_qty", 0),
                "total_rework_qty": result.get("total_rework_qty", 0),
                "total_downtime_min": result.get("total_downtime_min", 0),
                "overall_achievement_pct": result.get("overall_achievement_pct", 0.0),
                "total_present_employees": result.get("total_present_employees", 0),
                "total_absent_employees": result.get("total_absent_employees", 0),
                "overall_production_per_present_employee": result.get("overall_production_per_present_employee", 0.0),
                "items": result.get("items", []),
                "attribution_note": result.get(
                    "attribution_note",
                    "Production is tracked and attributed at the operator team level, not per individual employee.",
                ),
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "plant_id": clean_plant,
                    "shift_id": clean_shift,
                    "operator_team": clean_team,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve team production analytics: {str(err)}",
        }


@tool
def get_shift_efficiency_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve shift efficiency analytics comparing attendance and production metrics across shifts.

    Combines attendance data (present/absent/late/leave) and production performance (target vs actual,
    achievement %, quality, downtime) to evaluate throughput per present worker for each shift.

    Use this tool when answering questions about:
    - Shift production comparisons (Shift A vs Shift B vs Shift C)
    - Which shift has the highest/lowest production or efficiency
    - Throughput per present employee across shifts
    - Shift attendance versus output correlations

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        plant_id: Optional plant ID filter (e.g. 'PLANT-01').
        shift_id: Optional shift filter ('A', 'B', or 'C').

    Returns:
        Structured shift efficiency metrics: total_shifts, total_target_qty, total_actual_qty,
        total_good_qty, total_reject_qty, total_rework_qty, total_downtime_min,
        overall_achievement_pct, total_present_employees, total_absent_employees,
        overall_production_per_present_employee, and items for each shift.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_plant = plant_id.strip().upper() if plant_id and isinstance(plant_id, str) and plant_id.strip() else None
        clean_shift = shift_id.strip().upper() if shift_id and isinstance(shift_id, str) and shift_id.strip() else None

        with _get_tool_db_session() as session:
            result = workforce_analytics_service.get_shift_efficiency_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                plant_id=clean_plant,
                shift_id=clean_shift,
            )

            return {
                "status": "success",
                "total_shifts": result.get("total_shifts", 0),
                "total_target_qty": result.get("total_target_qty", 0),
                "total_actual_qty": result.get("total_actual_qty", 0),
                "total_good_qty": result.get("total_good_qty", 0),
                "total_reject_qty": result.get("total_reject_qty", 0),
                "total_rework_qty": result.get("total_rework_qty", 0),
                "total_downtime_min": result.get("total_downtime_min", 0),
                "overall_achievement_pct": result.get("overall_achievement_pct", 0.0),
                "total_present_employees": result.get("total_present_employees", 0),
                "total_absent_employees": result.get("total_absent_employees", 0),
                "overall_production_per_present_employee": result.get("overall_production_per_present_employee", 0.0),
                "items": result.get("items", []),
                "productivity_note": result.get("productivity_note", ""),
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "plant_id": clean_plant,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve shift efficiency analytics: {str(err)}",
        }


@tool
def get_skills_analytics(
    department_id: str | None = None,
    section_id: str | None = None,
    team_id: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve workforce skill analytics including skill grade distribution (L1, L2, L3, L4), certifications, and skill matrices across departments, sections, and teams.

    Use this tool when answering questions about:
    - How many employees are in skill grades L1, L2, L3, or L4
    - Certification counts (IPC-A-610, First Aid, ESD, LOTO, RF Test, Forklift)
    - Department-wise, section-wise, or team-wise skill grade distributions
    - Workforce skill capabilities and qualification levels

    Args:
        department_id: Optional department filter (e.g. 'DEPT-01', 'DEPT-02').
        section_id: Optional section filter (e.g. 'SEC-01', 'SEC-02').
        team_id: Optional team ID filter (e.g. 'TEAM-01', 'TEAM-02').
        shift_id: Optional home shift filter ('A', 'B', or 'C').

    Returns:
        Structured skill distribution: total_employees, skill_grade_distribution (counts and percentages for L1-L4),
        certification_distribution, department_skills matrix, section_skills matrix, team_skills matrix,
        and active_skill_distribution.
    """
    try:
        clean_dept = department_id.strip().upper() if department_id and isinstance(department_id, str) and department_id.strip() else None
        clean_sec = section_id.strip() if section_id and isinstance(section_id, str) and section_id.strip() else None
        clean_team = team_id.strip().upper() if team_id and isinstance(team_id, str) and team_id.strip() else None
        clean_shift = shift_id.strip().upper() if shift_id and isinstance(shift_id, str) and shift_id.strip() else None

        with _get_tool_db_session() as session:
            result = workforce_analytics_service.get_skills_analytics(
                session,
                department_id=clean_dept,
                section_id=clean_sec,
                team_id=clean_team,
                shift_id=clean_shift,
            )

            return {
                "status": "success",
                "total_employees": result.get("total_employees", 0),
                "skill_grade_distribution": result.get("skill_grade_distribution", []),
                "certification_distribution": result.get("certification_distribution", []),
                "department_skills": result.get("department_skills", []),
                "section_skills": result.get("section_skills", []),
                "team_skills": result.get("team_skills", []),
                "active_skill_distribution": result.get("active_skill_distribution", []),
                "filters_applied": {
                    "department_id": clean_dept,
                    "section_id": clean_sec,
                    "team_id": clean_team,
                    "shift_id": clean_shift,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve skills analytics: {str(err)}",
        }


@tool
def get_compliance_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve workforce training compliance and skill match analytics.

    Provides compliance percentages and counts for:
    - Training compliance: CURRENT vs EXPIRED records
    - Skill match: MATCHED vs GAP records
    - Department-wise, section-wise, and shift-wise compliance rates
    - Daily compliance trends

    Use this tool when answering questions about:
    - Training compliance rate or expired training records
    - Skill match rate or skill gaps
    - Departments, sections, or shifts with high skill gaps or expired training
    - Compliance trends over time

    Args:
        start_date: Optional inclusive start date in YYYY-MM-DD format (e.g. '2026-08-01').
        end_date: Optional inclusive end date in YYYY-MM-DD format (e.g. '2026-10-31').
        shift_id: Optional shift filter ('A', 'B', or 'C').
        department_id: Optional department filter (e.g. 'DEPT-01', 'DEPT-02').
        section_id: Optional section filter (e.g. 'SEC-01', 'SEC-02').
        plant_id: Optional plant ID filter (e.g. 'PLANT-01').

    Returns:
        Structured compliance metrics: training_compliance_pct, skill_match_pct,
        total_compliance_records, current_count, expired_count, total_skill_match_records,
        matched_count, gap_count, department_wise, section_wise, shift_wise breakdowns,
        and daily_trend.
    """
    try:
        parsed_start = _parse_optional_date(start_date, "start_date")
        parsed_end = _parse_optional_date(end_date, "end_date")
        _validate_date_window(parsed_start, parsed_end)

        clean_shift = shift_id.strip().upper() if shift_id and isinstance(shift_id, str) and shift_id.strip() else None
        clean_dept = department_id.strip().upper() if department_id and isinstance(department_id, str) and department_id.strip() else None
        clean_sec = section_id.strip() if section_id and isinstance(section_id, str) and section_id.strip() else None
        clean_plant = plant_id.strip().upper() if plant_id and isinstance(plant_id, str) and plant_id.strip() else None

        with _get_tool_db_session() as session:
            result = workforce_analytics_service.get_compliance_analytics(
                session,
                start_date=parsed_start,
                end_date=parsed_end,
                shift_id=clean_shift,
                department_id=clean_dept,
                section_id=clean_sec,
                plant_id=clean_plant,
            )

            return {
                "status": "success",
                "training_compliance_pct": result.get("training_compliance_pct", 0.0),
                "skill_match_pct": result.get("skill_match_pct", 0.0),
                "total_compliance_records": result.get("total_compliance_records", 0),
                "current_count": result.get("current_count", 0),
                "expired_count": result.get("expired_count", 0),
                "total_skill_match_records": result.get("total_skill_match_records", 0),
                "matched_count": result.get("matched_count", 0),
                "gap_count": result.get("gap_count", 0),
                "department_wise": result.get("department_wise", []),
                "section_wise": result.get("section_wise", []),
                "shift_wise": result.get("shift_wise", []),
                "daily_trend": result.get("daily_trend", []),
                "denominator_note": result.get("denominator_note", ""),
                "filters_applied": {
                    "start_date": parsed_start.isoformat() if parsed_start else None,
                    "end_date": parsed_end.isoformat() if parsed_end else None,
                    "shift_id": clean_shift,
                    "department_id": clean_dept,
                    "section_id": clean_sec,
                    "plant_id": clean_plant,
                },
            }
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "ValidationError",
            "message": str(err),
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "DatabaseError",
            "message": f"Failed to retrieve compliance analytics: {str(err)}",
        }


# Register core workforce tools and advanced analytics tools in the central tool registry (11 tools total)
tool_registry.register_tool(get_workforce_summary)
tool_registry.register_tool(get_attendance_analytics)
tool_registry.register_tool(get_department_analytics)
tool_registry.register_tool(get_shift_analytics)
tool_registry.register_tool(get_experience_analytics)
tool_registry.register_tool(get_section_analytics)
# Advanced Analytics Tools (Phase 4)
tool_registry.register_tool(get_overtime_analytics)
tool_registry.register_tool(get_team_production_analytics)
tool_registry.register_tool(get_shift_efficiency_analytics)
tool_registry.register_tool(get_skills_analytics)
tool_registry.register_tool(get_compliance_analytics)


@tool
def sample_health_tool() -> str:
    """Starter tool verifying tool execution and registration connectivity."""
    return "Workforce agent tool system is active."

