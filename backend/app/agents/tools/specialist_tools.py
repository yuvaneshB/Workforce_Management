"""Specialist Agent LangChain Tools for Central Workforce Intelligence (Phase 7.2).

Wraps the 7 domain specialist agent services and provides granular repository tools:
1. Specialist Analysis Tools (wrapped in Pydantic args_schema, returning trimmed dicts < 3 KB):
   - analyze_attendance
   - analyze_workforce_planning
   - analyze_overtime
   - analyze_attrition
   - analyze_skills
   - analyze_vendor
   - analyze_production

2. Granular Repository Tools:
   - get_attendance_streaks
   - get_top_absent_departments
   - get_attrition_by_reason
   - get_vendor_breakdown
   - get_production_vs_target
   - get_overtime_by_plant

3. Exports:
   - AGENT_TOOLSETS: Mapping of domain names to their specialist & granular tools.
   - ALL_SPECIALIST_TOOLS: Flat list of all specialist tools.
"""

import datetime as dt
import json
import logging
from typing import Any

from langchain_core.tools import BaseTool, tool
from pydantic import BaseModel, Field
from sqlalchemy import case, desc, func, select, text

from app.agents.attendance_agent_service import attendance_agent_service
from app.agents.attrition_agent_service import attrition_agent_service
from app.agents.overtime_agent_service import overtime_agent_service
from app.agents.production_agent_service import production_agent_service
from app.agents.skill_agent_service import skill_agent_service
from app.agents.tools.intelligence_tools import (
    get_labour_compliance,
    get_single_person_dependency,
)
from app.agents.tools.planning_tools import (
    get_shift_workforce_availability,
    get_workforce_shortage,
    recommend_replacement_employees,
)
from app.agents.tools.workforce_tools import (
    _get_tool_db_session,
    get_attendance_analytics,
    get_compliance_analytics,
    get_department_analytics,
    get_experience_analytics,
    get_overtime_analytics,
    get_section_analytics,
    get_shift_analytics,
    get_shift_efficiency_analytics,
    get_skills_analytics,
    get_team_production_analytics,
    get_workforce_summary,
    tool_registry,
)
from app.agents.vendor_agent_service import vendor_agent_service
from app.agents.workforce_planning_agent_service import workforce_planning_agent_service
from app.models.attendance import WorkforceAttendance
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.plant_master import PlantMaster
from app.models.section import SectionMaster
from app.models.shift_master import ShiftMaster
from app.models.vendor import VendorMaster
from app.repositories import (
    attendance_repository,
    attrition_repository,
    production_repository,
    workforce_analytics_repository,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Pydantic Args Schema for Specialist Analysis Tools
# =============================================================================

class SpecialistAnalysisArgs(BaseModel):
    start_date: str | None = Field(
        default=None,
        description="Analysis window start date in YYYY-MM-DD format (e.g. '2026-08-01'). Optional.",
    )
    end_date: str | None = Field(
        default=None,
        description="Analysis window end date in YYYY-MM-DD format (e.g. '2026-11-19'). Optional.",
    )
    plant_id: str | None = Field(
        default=None,
        description="Plant facility code filter: 'IN-KA-01' (Bengaluru) or 'IN-TN-01' (Chennai). Optional.",
    )
    shift_id: str | None = Field(
        default=None,
        description="Working shift filter: 'A' (GS1 morning), 'B' (S2 afternoon), or 'C' (NS3 night). Optional.",
    )
    department_id: str | None = Field(
        default=None,
        description="Department identifier filter (e.g. 'DEPT-01', 'DEPT-02'). Optional.",
    )


def _trim_analysis(res: dict[str, Any]) -> dict[str, Any]:
    """Trim specialist agent analysis payload to core metrics, top findings & recommendations under 3 KB."""
    findings = res.get("findings") or []
    trimmed_findings = []
    for f in findings[:5]:
        if isinstance(f, dict):
            trimmed_findings.append({
                "id": f.get("id"),
                "title": f.get("title"),
                "metric": f.get("metric"),
                "description": str(f.get("description") or f.get("detail") or f.get("affected") or "")[:150],
            })
        else:
            trimmed_findings.append(str(f)[:150])

    recommendations = res.get("recommendations") or []
    trimmed_recs = []
    for r in recommendations[:3]:
        if isinstance(r, dict):
            trimmed_recs.append({
                "id": r.get("id"),
                "title": r.get("title") or r.get("action") or r.get("headline"),
                "priority": r.get("priority"),
                "impact": str(r.get("impact") or r.get("benefit") or "")[:120],
            })
        else:
            trimmed_recs.append(str(r)[:120])

    trimmed = {
        "status": res.get("status", "COMPLETED"),
        "severity": res.get("severity", "NORMAL"),
        "metrics": res.get("metrics") or {},
        "findings": trimmed_findings,
        "recommendations": trimmed_recs,
        "filters_applied": res.get("filters_applied") or {},
    }

    # Ensure JSON representation is strictly under 3 KB (3072 bytes)
    payload_str = json.dumps(trimmed, default=str)
    if len(payload_str.encode("utf-8")) > 3000:
        trimmed["findings"] = trimmed["findings"][:3]
        trimmed["recommendations"] = trimmed["recommendations"][:2]

    return trimmed


# =============================================================================
# 1. Seven Specialist Analysis Tools
# =============================================================================

@tool(args_schema=SpecialistAnalysisArgs)
def analyze_attendance(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage attendance diagnostic audit across verified Neon records.

    When to use:
    - Questions assessing overall attendance health, absenteeism rates, lost production hours, or chronic absenteeism.
    - Examples: "Analyze attendance in plant IN-TN-01 for August 2026", "What is the absenteeism rate across shifts?"

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: 'A', 'B', or 'C' (optional).
    - department_id: 'DEPT-01', etc. (optional).
    """
    with _get_tool_db_session() as session:
        raw = attendance_agent_service.execute_attendance_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_workforce_planning(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage workforce planning audit measuring headcount availability and operational deficits.

    When to use:
    - Questions assessing staffing shortages against the 30-person operational baseline, roster deficits, or shift coverage gaps.
    - Examples: "Are we facing workforce shortages in Shift B?", "Audit manpower availability for 2026-08-01."

    Args:
    - start_date: Target planning date in YYYY-MM-DD format (optional).
    - end_date: Target window end date in YYYY-MM-DD format (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: 'A', 'B', or 'C' (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = workforce_planning_agent_service.execute_planning_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_overtime(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage overtime diagnostic audit measuring overtime hours, premiums, and statutory breaches.

    When to use:
    - Questions examining acute overtime concentration, statutory 50 hr/month limit breaches, or overtime budget spend.
    - Examples: "Which plant has the highest overtime hours?", "Audit overtime compliance and worker fatigue risk."

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: 'A', 'B', or 'C' (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = overtime_agent_service.execute_overtime_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_attrition(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage employee attrition, retention risk, and exit trend audit.

    When to use:
    - Questions investigating employee turnover, exit rates, resignation reasons, or department attrition hotspots.
    - Examples: "Why are employees resigning?", "What is the annual attrition rate in Assembly vs Machining?"

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: Shift code (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = attrition_agent_service.execute_attrition_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_skills(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage skill matrix, training compliance, and certification gap audit.

    When to use:
    - Questions about employee qualifications (L1–L4 grade levels), single-point dependencies, or training program completion.
    - Examples: "Where do we have critical skill gaps?", "How many operators hold certified L3 skills in Maintenance?"

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: Shift code (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = skill_agent_service.execute_skill_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_vendor(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete vendor contractor workforce audit across 6 partner staffing agencies.

    When to use:
    - Questions analyzing contractor reliance, vendor agency headcount distributions, contractor attendance, or partner SLAs.
    - Examples: "What percentage of our workforce is vendor contractor?", "How are workers distributed across the 6 staffing agencies?"

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: Shift code (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = vendor_agent_service.execute_vendor_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


@tool(args_schema=SpecialistAnalysisArgs)
def analyze_production(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
) -> dict[str, Any]:
    """Execute complete 5-stage manufacturing line production, target variance, and downtime analysis.

    When to use:
    - Questions examining actual vs target output quantities, line production rates, downtime minutes, or scrap impacts.
    - Examples: "Compare production vs target for Shift A in September 2026", "What is the primary cause of downtime on Assembly line?"

    Args:
    - start_date: YYYY-MM-DD start filter (optional).
    - end_date: YYYY-MM-DD end filter (optional).
    - plant_id: 'IN-KA-01' or 'IN-TN-01' (optional).
    - shift_id: Shift code (optional).
    - department_id: Department code (optional).
    """
    with _get_tool_db_session() as session:
        raw = production_agent_service.execute_production_analysis(
            session,
            start_date=start_date,
            end_date=end_date,
            plant_id=plant_id,
            shift_id=shift_id,
            department_id=department_id,
            skip_llm=True,
        )
        return _trim_analysis(raw)


# =============================================================================
# 2. Granular Repository Tools
# =============================================================================

class AttendanceStreaksArgs(BaseModel):
    plant_id: str | None = Field(default=None, description="Plant ID ('IN-KA-01' or 'IN-TN-01'). Optional.")
    min_days: int = Field(default=3, description="Minimum consecutive absent days to flag. Defaults to 3.")
    limit: int = Field(default=5, description="Maximum number of streak records to return. Defaults to 5.")


@tool(args_schema=AttendanceStreaksArgs)
def get_attendance_streaks(
    plant_id: str | None = None,
    min_days: int = 3,
    limit: int = 5,
) -> dict[str, Any]:
    """Identify employees with recurring consecutive absent streaks (>= 3 days) for intervention.

    When to use:
    - Specific questions regarding repeat absentees, chronic patterns, or consecutive missed shifts.
    - Example: "Who has been absent 3 or more days consecutively in Plant 1?"
    """
    with _get_tool_db_session() as db:
        try:
            streak_sql = text("""
                WITH ranked_attendance AS (
                    SELECT
                        employee_id,
                        plant_id,
                        work_date,
                        attendance_status,
                        work_date - (DENSE_RANK() OVER (PARTITION BY employee_id ORDER BY work_date))::integer AS grp
                    FROM public.attendance_transactions
                    WHERE UPPER(attendance_status) = 'ABSENT'
                      AND (CAST(:plant_id AS VARCHAR) IS NULL OR plant_id = :plant_id)
                ),
                absent_streaks AS (
                    SELECT
                        employee_id,
                        plant_id,
                        grp,
                        COUNT(*) AS consecutive_days,
                        MIN(work_date) AS streak_start,
                        MAX(work_date) AS streak_end
                    FROM ranked_attendance
                    GROUP BY employee_id, plant_id, grp
                    HAVING COUNT(*) >= :min_days
                )
                SELECT
                    s.employee_id,
                    e.full_name,
                    s.plant_id,
                    s.consecutive_days,
                    s.streak_start,
                    s.streak_end
                FROM absent_streaks s
                LEFT JOIN public.employee_master e ON s.employee_id = e.employee_id
                ORDER BY s.consecutive_days DESC, s.streak_end DESC
                LIMIT :limit;
            """)
            rows = db.execute(
                streak_sql,
                {"plant_id": plant_id, "min_days": min_days, "limit": limit},
            ).fetchall()

            streaks = [
                {
                    "employee_id": r[0],
                    "employee_name": r[1] or "Shopfloor Operator",
                    "plant_id": r[2],
                    "consecutive_days": int(r[3]),
                    "streak_start": str(r[4]),
                    "streak_end": str(r[5]),
                }
                for r in rows
            ]
            return {"total_streaks_found": len(streaks), "streaks": streaks}
        except Exception as exc:
            logger.error("Error retrieving attendance streaks: %s", exc)
            return {"total_streaks_found": 0, "streaks": [], "error": str(exc)}


class TopAbsentDeptsArgs(BaseModel):
    start_date: str | None = Field(default=None, description="Start date YYYY-MM-DD. Optional.")
    end_date: str | None = Field(default=None, description="End date YYYY-MM-DD. Optional.")
    plant_id: str | None = Field(default=None, description="Plant ID ('IN-KA-01' or 'IN-TN-01'). Optional.")
    limit: int = Field(default=5, description="Maximum departments to return. Defaults to 5.")


@tool(args_schema=TopAbsentDeptsArgs)
def get_top_absent_departments(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """Retrieve top departments ranked by absenteeism count and absence rate.

    When to use:
    - Specific questions asking which departments experience the highest absentee spikes or worst attendance.
    - Example: "Which department has the highest absenteeism in Chennai plant?"
    """
    with _get_tool_db_session() as db:
        filters = []
        if start_date:
            try:
                filters.append(WorkforceAttendance.work_date >= dt.date.fromisoformat(start_date))
            except ValueError:
                pass
        if end_date:
            try:
                filters.append(WorkforceAttendance.work_date <= dt.date.fromisoformat(end_date))
            except ValueError:
                pass
        if plant_id:
            filters.append(WorkforceAttendance.plant_id == plant_id)

        stmt = (
            select(
                DepartmentMaster.department_id,
                DepartmentMaster.department_name,
                func.count(WorkforceAttendance.attendance_id).label("total_records"),
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)).label("absent_count"),
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "LATE", 1), else_=0)).label("late_count"),
            )
            .select_from(WorkforceAttendance)
            .outerjoin(DepartmentMaster, WorkforceAttendance.department_id == DepartmentMaster.department_id)
        )
        if filters:
            stmt = stmt.where(*filters)
        stmt = stmt.group_by(DepartmentMaster.department_id, DepartmentMaster.department_name).order_by(desc("absent_count")).limit(limit)

        rows = db.execute(stmt).all()
        departments = []
        for r in rows:
            tot = int(r.total_records or 0)
            abs_cnt = int(r.absent_count or 0)
            departments.append({
                "department_id": r.department_id or "UNKNOWN",
                "department_name": r.department_name or "General Department",
                "total_records": tot,
                "absent_count": abs_cnt,
                "late_count": int(r.late_count or 0),
                "absenteeism_rate": round(abs_cnt * 100.0 / tot, 1) if tot > 0 else 0.0,
            })
        return {"departments": departments}


class AttritionReasonArgs(BaseModel):
    start_date: str | None = Field(default=None, description="Start date YYYY-MM-DD. Optional.")
    end_date: str | None = Field(default=None, description="End date YYYY-MM-DD. Optional.")
    plant_id: str | None = Field(default=None, description="Plant ID ('IN-KA-01' or 'IN-TN-01'). Optional.")


@tool(args_schema=AttritionReasonArgs)
def get_attrition_by_reason(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve breakdown of employee exits grouped by primary resignation reason.

    When to use:
    - Specific questions asking why workers left or ranking the top exit drivers (better pay, commute, relocation, etc.).
    - Example: "What are the top 3 reasons workers give when resigning?"
    """
    with _get_tool_db_session() as db:
        s_d = dt.date.fromisoformat(start_date) if start_date else None
        e_d = dt.date.fromisoformat(end_date) if end_date else None
        raw = attrition_repository.get_attrition_analytics(
            db,
            start_date=s_d,
            end_date=e_d,
            plant_id=plant_id,
        )
        by_reason = raw.get("by_reason") or []
        total_exits = raw.get("total_exits", 0)
        reasons = [
            {
                "reason": r.get("reason", "Other"),
                "count": r.get("count", 0),
                "percentage": r.get("pct", 0.0),
            }
            for r in by_reason
        ]
        return {
            "total_exits": total_exits,
            "annualized_rate_pct": raw.get("annualized_rate", 0.0),
            "reasons": reasons,
        }


class VendorBreakdownArgs(BaseModel):
    plant_id: str | None = Field(default=None, description="Plant ID filter ('IN-KA-01' or 'IN-TN-01'). Optional.")


@tool(args_schema=VendorBreakdownArgs)
def get_vendor_breakdown(
    plant_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve contractor headcount and partner share percentage across the 6 staffing agencies.

    When to use:
    - Granular questions checking agency shares, assigned vs active headcounts, or comparing vendors V01 through V06.
    - Example: "Which vendor agency supplies the most workers to our plants?"
    """
    with _get_tool_db_session() as db:
        raw = workforce_analytics_repository.get_vendor_analytics(db, plant_id=plant_id)
        items = raw.get("items") or []
        vendors = [
            {
                "vendor_id": v.get("vendor_id"),
                "vendor_name": v.get("vendor_name"),
                "assigned_count": v.get("assigned_count", 0),
                "active_count": v.get("active_count", 0),
                "contractor_share_pct": v.get("percentage", 0.0),
            }
            for v in items
        ]
        total_vendor = raw.get("total_vendor_workforce", 0)
        active_vendor = raw.get("total_active_vendor_workforce", 0)
        total_perm = raw.get("total_permanent_workforce", 0)
        total_wf = total_vendor + total_perm

        contractor_share_of_workforce_pct = round((total_vendor / max(1, total_wf)) * 100, 1)
        active_contractor_share_pct = round((active_vendor / max(1, total_wf)) * 100, 1)
        inactive_count = max(0, total_vendor - active_vendor)
        inactive_pct = round((inactive_count / max(1, total_vendor)) * 100, 1) if total_vendor > 0 else 0.0

        sorted_by_assigned = sorted(vendors, key=lambda x: x.get("assigned_count", 0), reverse=True)
        top2_assigned = (sorted_by_assigned[0]["assigned_count"] + sorted_by_assigned[1]["assigned_count"]) if len(sorted_by_assigned) >= 2 else (sorted_by_assigned[0]["assigned_count"] if sorted_by_assigned else 0)
        top2_vendor_share_pct = round((top2_assigned / max(1, total_vendor)) * 100, 1) if total_vendor > 0 else 0.0

        return {
            "total_vendors": raw.get("total_vendors", len(vendors)),
            "total_workforce": total_wf,
            "total_vendor_workforce": total_vendor,
            "total_active_vendor_workforce": active_vendor,
            "total_permanent_workforce": total_perm,
            "contractor_share_of_workforce_pct": contractor_share_of_workforce_pct,
            "active_contractor_share_pct": active_contractor_share_pct,
            "top2_vendor_share_pct": top2_vendor_share_pct,
            "inactive_count": inactive_count,
            "inactive_pct": inactive_pct,
            "vendors": vendors,
        }


class ProductionVsTargetArgs(BaseModel):
    start_date: str | None = Field(default=None, description="Start date YYYY-MM-DD. Optional.")
    end_date: str | None = Field(default=None, description="End date YYYY-MM-DD. Optional.")
    plant_id: str | None = Field(default=None, description="Plant ID filter ('IN-KA-01' or 'IN-TN-01'). Optional.")
    shift_id: str | None = Field(default=None, description="Shift ID filter ('A', 'B', 'C'). Optional.")


@tool(args_schema=ProductionVsTargetArgs)
def get_production_vs_target(
    start_date: str | None = None,
    end_date: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Calculate actual production output vs planned target units, variance, and line downtime.

    When to use:
    - Specific questions measuring output efficiency, schedule achievement %, or manufacturing volume gaps.
    - Example: "Did Shift B hit production targets on 2026-08-01?"
    """
    with _get_tool_db_session() as db:
        s_d = dt.date.fromisoformat(start_date) if start_date else None
        e_d = dt.date.fromisoformat(end_date) if end_date else None
        raw = production_repository.get_production_analytics(
            db,
            start_date=s_d,
            end_date=e_d,
            plant_id=plant_id,
            shift_id=shift_id,
        )
        target = raw.get("target_units", 0)
        actual = raw.get("actual_units", 0)
        variance = actual - target
        achieve_pct = round((actual / target) * 100, 1) if target > 0 else 0.0
        return {
            "target_units": target,
            "actual_units": actual,
            "variance_units": variance,
            "achievement_rate_pct": achieve_pct,
            "good_units": raw.get("good_units", 0),
            "rejected_units": raw.get("rejected_units", 0),
            "downtime_minutes": raw.get("downtime_minutes", 0),
            "by_plant_line": raw.get("by_plant_line", [])[:5],
        }


class OvertimeByPlantArgs(BaseModel):
    start_date: str | None = Field(default=None, description="Start date YYYY-MM-DD. Optional.")
    end_date: str | None = Field(default=None, description="End date YYYY-MM-DD. Optional.")
    shift_id: str | None = Field(default=None, description="Shift ID filter ('A', 'B', 'C'). Optional.")


@tool(args_schema=OvertimeByPlantArgs)
def get_overtime_by_plant(
    start_date: str | None = None,
    end_date: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve overtime hours, employee participation counts, and overtime rates compared across plants.

    When to use:
    - Specific questions comparing overtime between IN-KA-01 and IN-TN-01 facilities.
    - Example: "Which plant has more overtime hours, Bengaluru or Chennai?"
    """
    with _get_tool_db_session() as db:
        where_clauses = ["1=1"]
        params: dict[str, Any] = {}
        if start_date:
            try:
                params["s_date"] = dt.date.fromisoformat(start_date)
                where_clauses.append("ot.work_date >= :s_date")
            except ValueError:
                pass
        if end_date:
            try:
                params["e_date"] = dt.date.fromisoformat(end_date)
                where_clauses.append("ot.work_date <= :e_date")
            except ValueError:
                pass
        if shift_id:
            params["shift_id"] = shift_id.strip().upper()
            where_clauses.append("ot.shift_id = :shift_id")

        where_sql = " AND ".join(where_clauses)
        plant_query = text(f"""
            SELECT 
                ot.plant_id,
                COUNT(*) as ot_shifts,
                COUNT(DISTINCT ot.employee_id) as employees_count,
                COALESCE(SUM(ot.ot_hours), 0) as ot_hours,
                COALESCE(SUM(ot.ot_cost_inr), 0) as ot_cost_inr
            FROM public.overtime_transactions ot
            WHERE {where_sql}
            GROUP BY ot.plant_id
            ORDER BY ot.plant_id
        """)
        rows = db.execute(plant_query, params).mappings().all()
        total_hours = sum(float(r["ot_hours"]) for r in rows)
        plant_names = {"IN-KA-01": "Bengaluru Plant (IN-KA-01)", "IN-TN-01": "Chennai Plant (IN-TN-01)"}
        plants = [
            {
                "plant_id": str(r["plant_id"]),
                "plant_name": plant_names.get(str(r["plant_id"]), str(r["plant_id"])),
                "overtime_shifts": int(r["ot_shifts"]),
                "employees_with_ot": int(r["employees_count"]),
                "overtime_hours": round(float(r["ot_hours"]), 1),
                "overtime_cost_inr": round(float(r["ot_cost_inr"]), 2),
                "share_pct": round(float(r["ot_hours"]) / total_hours * 100.0, 1) if total_hours > 0 else 0.0,
            }
            for r in rows
        ]
        return {
            "total_overtime_hours": round(total_hours, 1),
            "plant_breakdown": plants,
        }


# =============================================================================
# Granular Employee Directory & Recent Joiner Tools
# =============================================================================

class EmployeeDetailsArgs(BaseModel):
    employee_id: str | None = Field(
        default=None,
        description="Employee ID to look up (e.g. 'EMP-10001', 'EMP-11701'). Exact or case-insensitive match. Optional if name is provided.",
    )
    name: str | None = Field(
        default=None,
        description="Employee full name or partial name (e.g. 'Test Zzz', 'Sumathi', 'Arun'). Case-insensitive partial match. Optional if employee_id is provided.",
    )


@tool(args_schema=EmployeeDetailsArgs)
def get_employee_details(
    employee_id: str | None = None,
    name: str | None = None,
) -> dict[str, Any]:
    """Retrieve detailed profile information for a specific employee by ID or name.

    When to use:
    - Use this tool whenever the user asks for details, profile, role, department, shift, or status of a specific employee (e.g. 'Test Zzz details sollu', 'Tell me about employee EMP-10001', 'Who is Kavitha Subramanian?', 'What is Test Zzz's designation and plant?').

    Args:
    - employee_id: Unique identifier (e.g. 'EMP-10001', 'EMP-11701'). Optional.
    - name: Full or partial employee name (e.g. 'Test Zzz'). Optional.

    Example:
    get_employee_details(name="Test Zzz") -> returns key profile fields (ID, name, plant, department, section, designation, employment type, vendor, shift, skill grade, date of joining, tenure band, status). Output is under 3 KB.
    """
    clean_id = (employee_id or "").strip()
    clean_name = (name or "").strip()

    if not clean_id and not clean_name:
        return {
            "status": "error",
            "message": "Please provide an employee_id or name to search.",
            "matches": [],
        }

    with _get_tool_db_session() as db:
        query = (
            select(
                EmployeeMaster.employee_id,
                EmployeeMaster.full_name,
                EmployeeMaster.plant_id,
                PlantMaster.plant_name,
                EmployeeMaster.department_id,
                DepartmentMaster.department_name,
                EmployeeMaster.section_id,
                SectionMaster.section_name,
                EmployeeMaster.designation,
                EmployeeMaster.employment_type,
                EmployeeMaster.vendor_id,
                VendorMaster.vendor_name,
                EmployeeMaster.shift_id,
                ShiftMaster.shift_name,
                EmployeeMaster.grade,
                EmployeeMaster.date_of_joining,
                EmployeeMaster.employment_status,
                EmployeeExperience.experience_band,
            )
            .select_from(EmployeeMaster)
            .outerjoin(PlantMaster, EmployeeMaster.plant_id == PlantMaster.plant_id)
            .outerjoin(DepartmentMaster, EmployeeMaster.department_id == DepartmentMaster.department_id)
            .outerjoin(SectionMaster, EmployeeMaster.section_id == SectionMaster.section_id)
            .outerjoin(VendorMaster, EmployeeMaster.vendor_id == VendorMaster.vendor_id)
            .outerjoin(ShiftMaster, EmployeeMaster.shift_id == ShiftMaster.shift_id)
            .outerjoin(EmployeeExperience, EmployeeMaster.employee_id == EmployeeExperience.employee_id)
        )

        if clean_id:
            query = query.where(func.lower(EmployeeMaster.employee_id) == clean_id.lower())
        else:
            query = query.where(func.lower(EmployeeMaster.full_name).like(f"%{clean_name.lower()}%"))

        query = query.order_by(EmployeeMaster.employee_id).limit(5)
        rows = db.execute(query).all()

        if not rows:
            return {
                "status": "not_found",
                "message": f"No employee found matching {'ID ' + clean_id if clean_id else 'name ' + clean_name}.",
                "matches": [],
            }

        matches = []
        for r in rows:
            matches.append({
                "employee_id": r.employee_id,
                "name": r.full_name,
                "plant": f"{r.plant_name} ({r.plant_id})" if r.plant_name else r.plant_id,
                "department": r.department_name or r.department_id,
                "section": r.section_name or r.section_id,
                "designation": r.designation,
                "employment_type": r.employment_type,
                "vendor": r.vendor_name or r.vendor_id or "N/A",
                "shift": f"{r.shift_name} ({r.shift_id})" if r.shift_name else r.shift_id,
                "skill_grade": r.grade,
                "date_of_joining": str(r.date_of_joining),
                "tenure_band": r.experience_band or "N/A",
                "status": r.employment_status,
            })

        return {
            "status": "success",
            "count": len(matches),
            "matches": matches,
        }


class RecentJoinersArgs(BaseModel):
    days: int = Field(
        default=30,
        description="Number of past days to look back for joiners (default: 30). Optional.",
    )
    plant_id: str | None = Field(
        default=None,
        description="Filter by manufacturing plant facility ID (e.g. 'IN-TN-01', 'IN-KA-01'). Optional.",
    )


@tool(args_schema=RecentJoinersArgs)
def get_recent_joiners(
    days: int = 30,
    plant_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve new employees who joined recently (returns total count and the latest 10 employees).

    When to use:
    - Use this tool whenever asking about new joiners, recent hires, onboarding count, or newly added workforce (e.g. 'idhu varaikkum evlo new joiners?', 'How many new employees joined in the last 30 days?', 'recent joiners in Chennai plant').

    Args:
    - days: Number of days to look back from the latest operational date (default 30). Optional.
    - plant_id: Optional plant ID filter ('IN-TN-01' or 'IN-KA-01'). Optional.

    Example:
    get_recent_joiners(days=30) -> returns count of recent joiners and list of up to 10 latest employees with department, designation, and joining date.
    """
    lookback_days = max(1, int(days)) if days else 30
    clean_plant = (plant_id or "").strip() if plant_id else None

    with _get_tool_db_session() as db:
        max_doj = db.execute(select(func.max(EmployeeMaster.date_of_joining))).scalar()
        ref_date = max(dt.date.today(), max_doj) if max_doj else dt.date.today()
        cutoff = ref_date - dt.timedelta(days=lookback_days)

        filters = [EmployeeMaster.date_of_joining >= cutoff]
        if clean_plant:
            filters.append(EmployeeMaster.plant_id == clean_plant)

        total_recent_count = db.execute(select(func.count(EmployeeMaster.employee_id)).where(*filters)).scalar() or 0

        # Cohort count of new joiners within the last 12 months (standard enterprise new joiner class)
        twelve_months_cutoff = ref_date - dt.timedelta(days=365)
        twelve_months_filters = [EmployeeMaster.date_of_joining >= twelve_months_cutoff]
        if clean_plant:
            twelve_months_filters.append(EmployeeMaster.plant_id == clean_plant)
        total_new_joiners_12m = db.execute(
            select(func.count(EmployeeMaster.employee_id)).where(*twelve_months_filters)
        ).scalar() or 0

        # Latest 10 employees
        stmt = (
            select(
                EmployeeMaster.employee_id,
                EmployeeMaster.full_name,
                EmployeeMaster.plant_id,
                PlantMaster.plant_name,
                EmployeeMaster.department_id,
                DepartmentMaster.department_name,
                EmployeeMaster.designation,
                EmployeeMaster.employment_type,
                VendorMaster.vendor_name,
                EmployeeMaster.date_of_joining,
                EmployeeMaster.employment_status,
            )
            .select_from(EmployeeMaster)
            .outerjoin(PlantMaster, EmployeeMaster.plant_id == PlantMaster.plant_id)
            .outerjoin(DepartmentMaster, EmployeeMaster.department_id == DepartmentMaster.department_id)
            .outerjoin(VendorMaster, EmployeeMaster.vendor_id == VendorMaster.vendor_id)
            .where(*filters)
            .order_by(desc(EmployeeMaster.date_of_joining), desc(EmployeeMaster.employee_id))
            .limit(10)
        )
        rows = db.execute(stmt).all()

        recent_list = [
            {
                "employee_id": r.employee_id,
                "name": r.full_name,
                "plant": f"{r.plant_name} ({r.plant_id})" if r.plant_name else r.plant_id,
                "department": r.department_name or r.department_id,
                "designation": r.designation,
                "employment_type": r.employment_type,
                "vendor": r.vendor_name or "N/A",
                "date_of_joining": str(r.date_of_joining),
                "status": r.employment_status,
            }
            for r in rows
        ]

        return {
            "status": "success",
            "lookback_days": lookback_days,
            "period_window": f"{cutoff.isoformat()} to {ref_date.isoformat()}",
            "recent_joiners_in_window_count": total_recent_count,
            "total_new_joiners_cohort_count": total_new_joiners_12m,
            "plant_filter": clean_plant or "All Plants",
            "latest_joiners": recent_list,
        }


# =============================================================================
# 3. AGENT_TOOLSETS Export
# =============================================================================

AGENT_TOOLSETS: dict[str, list[BaseTool]] = {
    "attendance": [
        analyze_attendance,
        get_attendance_streaks,
        get_top_absent_departments,
        get_attendance_analytics,
        get_shift_analytics,
    ],
    "workforce_planning": [
        analyze_workforce_planning,
        get_employee_details,
        get_recent_joiners,
        get_workforce_shortage,
        get_shift_workforce_availability,
        recommend_replacement_employees,
        get_workforce_summary,
        get_single_person_dependency,
    ],
    "overtime": [
        analyze_overtime,
        get_overtime_by_plant,
        get_overtime_analytics,
        get_labour_compliance,
    ],
    "attrition": [
        analyze_attrition,
        get_attrition_by_reason,
        get_experience_analytics,
    ],
    "skill": [
        analyze_skills,
        get_skills_analytics,
        get_compliance_analytics,
        get_single_person_dependency,
    ],
    "vendor": [
        analyze_vendor,
        get_employee_details,
        get_recent_joiners,
        get_vendor_breakdown,
        get_workforce_summary,
    ],
    "production": [
        analyze_production,
        get_production_vs_target,
        get_team_production_analytics,
        get_shift_efficiency_analytics,
        get_section_analytics,
    ],
}

ALL_SPECIALIST_TOOLS: list[BaseTool] = [
    analyze_attendance,
    analyze_workforce_planning,
    analyze_overtime,
    analyze_attrition,
    analyze_skills,
    analyze_vendor,
    analyze_production,
    get_attendance_streaks,
    get_top_absent_departments,
    get_attrition_by_reason,
    get_vendor_breakdown,
    get_production_vs_target,
    get_overtime_by_plant,
    get_employee_details,
    get_recent_joiners,
]

# Register with central WorkforceToolRegistry
for _t in ALL_SPECIALIST_TOOLS:
    try:
        tool_registry.register(_t)
    except Exception:
        pass

__all__ = [
    "SpecialistAnalysisArgs",
    "AttendanceStreaksArgs",
    "TopAbsentDeptsArgs",
    "AttritionReasonArgs",
    "VendorBreakdownArgs",
    "ProductionVsTargetArgs",
    "OvertimeByPlantArgs",
    "EmployeeDetailsArgs",
    "RecentJoinersArgs",
    "analyze_attendance",
    "analyze_workforce_planning",
    "analyze_overtime",
    "analyze_attrition",
    "analyze_skills",
    "analyze_vendor",
    "analyze_production",
    "get_attendance_streaks",
    "get_top_absent_departments",
    "get_attrition_by_reason",
    "get_vendor_breakdown",
    "get_production_vs_target",
    "get_overtime_by_plant",
    "get_employee_details",
    "get_recent_joiners",
    "AGENT_TOOLSETS",
    "ALL_SPECIALIST_TOOLS",
]

