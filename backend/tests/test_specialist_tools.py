"""Integration unit tests for Specialist Agent Tools running on live Neon PostgreSQL."""

import json
from typing import Any

import pytest

from app.agents.tools.specialist_tools import (
    AGENT_TOOLSETS,
    ALL_SPECIALIST_TOOLS,
    analyze_attendance,
    analyze_attrition,
    analyze_overtime,
    analyze_production,
    analyze_skills,
    analyze_vendor,
    analyze_workforce_planning,
    get_attendance_streaks,
    get_attrition_by_reason,
    get_overtime_by_plant,
    get_production_vs_target,
    get_top_absent_departments,
    get_vendor_breakdown,
)


def _assert_valid_trimmed_analysis(result: dict[str, Any], tool_name: str) -> None:
    """Helper verifying that an analysis tool returns the required schema and payload size <= 3 KB."""
    assert isinstance(result, dict), f"{tool_name} must return a dictionary"
    assert "metrics" in result, f"{tool_name} missing 'metrics'"
    assert "findings" in result, f"{tool_name} missing 'findings'"
    assert "recommendations" in result, f"{tool_name} missing 'recommendations'"
    assert "filters_applied" in result, f"{tool_name} missing 'filters_applied'"

    # Max 5 findings and 3 recommendations
    assert len(result["findings"]) <= 5, f"{tool_name} findings exceeds 5"
    assert len(result["recommendations"]) <= 3, f"{tool_name} recommendations exceeds 3"

    # Verify JSON size is strictly under 3 KB (3072 bytes)
    encoded_size = len(json.dumps(result, default=str).encode("utf-8"))
    assert encoded_size <= 3072, f"{tool_name} payload ({encoded_size} bytes) exceeds 3 KB limit"


# =============================================================================
# 1. Tests for the 7 Specialist Analysis Tools
# =============================================================================

def test_analyze_attendance_live_db():
    """Verify analyze_attendance executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_attendance.invoke({})
    _assert_valid_trimmed_analysis(res, "analyze_attendance")
    assert res["metrics"].get("total_records", 0) > 0
    assert "attendance_rate" in res["metrics"]


def test_analyze_workforce_planning_live_db():
    """Verify analyze_workforce_planning executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_workforce_planning.invoke({"start_date": "2026-08-01"})
    _assert_valid_trimmed_analysis(res, "analyze_workforce_planning")
    assert res["status"] in ("COMPLETED", "NORMAL", "ATTENTION_REQUIRED")


def test_analyze_overtime_live_db():
    """Verify analyze_overtime executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_overtime.invoke({"plant_id": "IN-TN-01"})
    _assert_valid_trimmed_analysis(res, "analyze_overtime")
    assert "total_overtime_hours" in res["metrics"]


def test_analyze_attrition_live_db():
    """Verify analyze_attrition executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_attrition.invoke({})
    _assert_valid_trimmed_analysis(res, "analyze_attrition")
    assert "total_exits" in res["metrics"]


def test_analyze_skills_live_db():
    """Verify analyze_skills executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_skills.invoke({"department_id": "DEPT-01"})
    _assert_valid_trimmed_analysis(res, "analyze_skills")
    assert "total_skill_records" in res["metrics"] or "total_evaluated" in res["metrics"] or len(res["metrics"]) > 0


def test_analyze_vendor_live_db():
    """Verify analyze_vendor executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_vendor.invoke({"plant_id": "IN-KA-01"})
    _assert_valid_trimmed_analysis(res, "analyze_vendor")
    assert "total_vendor" in res["metrics"] or "total_vendor_workforce" in res["metrics"]


def test_analyze_production_live_db():
    """Verify analyze_production executes against Neon DB, returning trimmed output <= 3 KB."""
    res = analyze_production.invoke({"shift_id": "A"})
    _assert_valid_trimmed_analysis(res, "analyze_production")
    assert "total_actual_units" in res["metrics"] or "actual_units" in res["metrics"]


# =============================================================================
# 2. Tests for Granular Repository Tools
# =============================================================================

def test_get_attendance_streaks_live_db():
    """Verify get_attendance_streaks retrieves consecutive absence records."""
    res = get_attendance_streaks.invoke({"min_days": 3, "limit": 5})
    assert isinstance(res, dict)
    assert "total_streaks_found" in res
    assert "streaks" in res
    assert isinstance(res["streaks"], list)
    if res["streaks"]:
        first = res["streaks"][0]
        assert "employee_id" in first
        assert "consecutive_days" in first
        assert first["consecutive_days"] >= 3


def test_get_top_absent_departments_live_db():
    """Verify get_top_absent_departments aggregates department absenteeism."""
    res = get_top_absent_departments.invoke({"limit": 5})
    assert isinstance(res, dict)
    assert "departments" in res
    assert len(res["departments"]) > 0
    dept = res["departments"][0]
    assert "department_id" in dept
    assert "department_name" in dept
    assert "absent_count" in dept
    assert "absenteeism_rate" in dept


def test_get_attrition_by_reason_live_db():
    """Verify get_attrition_by_reason returns exit reasons and rate."""
    res = get_attrition_by_reason.invoke({})
    assert isinstance(res, dict)
    assert "total_exits" in res
    assert "reasons" in res
    assert len(res["reasons"]) > 0
    r0 = res["reasons"][0]
    assert "reason" in r0
    assert "count" in r0
    assert "percentage" in r0


def test_get_vendor_breakdown_live_db():
    """Verify get_vendor_breakdown retrieves 6 partner staffing agencies."""
    res = get_vendor_breakdown.invoke({})
    assert isinstance(res, dict)
    assert res["total_vendors"] == 6
    assert len(res["vendors"]) == 6
    v0 = res["vendors"][0]
    assert "vendor_id" in v0
    assert "assigned_count" in v0
    assert "active_count" in v0


def test_get_production_vs_target_live_db():
    """Verify get_production_vs_target computes production variance."""
    res = get_production_vs_target.invoke({})
    assert isinstance(res, dict)
    assert "target_units" in res
    assert "actual_units" in res
    assert "variance_units" in res
    assert "achievement_rate_pct" in res


def test_get_overtime_by_plant_live_db():
    """Verify get_overtime_by_plant aggregates overtime across plants."""
    res = get_overtime_by_plant.invoke({})
    assert isinstance(res, dict)
    assert "total_overtime_hours" in res
    assert "plant_breakdown" in res
    assert len(res["plant_breakdown"]) >= 2


# =============================================================================
# 3. Tests for Empty / Non-matching Data Handling
# =============================================================================

def test_tools_empty_data_handling():
    """Verify each tool handles non-matching date windows or plant IDs gracefully without crashing."""
    # Future dates with no records
    empty_res = analyze_attendance.invoke({"start_date": "2099-01-01", "end_date": "2099-01-02"})
    _assert_valid_trimmed_analysis(empty_res, "analyze_attendance (empty)")
    assert empty_res["metrics"].get("total_records", 0) == 0

    # Non-existent plant ID
    streaks_empty = get_attendance_streaks.invoke({"plant_id": "IN-NONEXISTENT"})
    assert streaks_empty["total_streaks_found"] == 0
    assert len(streaks_empty["streaks"]) == 0

    # Empty date range for production
    prod_empty = get_production_vs_target.invoke({"start_date": "2099-01-01", "end_date": "2099-01-02"})
    assert prod_empty["target_units"] == 0
    assert prod_empty["actual_units"] == 0


# =============================================================================
# 4. Tests for AGENT_TOOLSETS Export Structure
# =============================================================================

def test_agent_toolsets_structure():
    """Verify AGENT_TOOLSETS contains all 7 domains and includes planning/intelligence tools."""
    expected_domains = {
        "attendance",
        "workforce_planning",
        "overtime",
        "attrition",
        "skill",
        "vendor",
        "production",
    }
    assert set(AGENT_TOOLSETS.keys()) == expected_domains

    # Check workforce_planning contains existing planning & intelligence tools
    wp_names = {t.name for t in AGENT_TOOLSETS["workforce_planning"]}
    assert "analyze_workforce_planning" in wp_names
    assert "get_workforce_shortage" in wp_names
    assert "get_shift_workforce_availability" in wp_names
    assert "recommend_replacement_employees" in wp_names
    assert "get_single_person_dependency" in wp_names

    # Check overtime contains existing intelligence & analytics tools
    ot_names = {t.name for t in AGENT_TOOLSETS["overtime"]}
    assert "analyze_overtime" in ot_names
    assert "get_overtime_by_plant" in ot_names
    assert "get_overtime_analytics" in ot_names
    assert "get_labour_compliance" in ot_names

    # Check ALL_SPECIALIST_TOOLS count
    assert len(ALL_SPECIALIST_TOOLS) == 13

