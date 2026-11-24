"""Tests for dynamic runtime period injection, overtime shift filter resolution, and verified metric filtering."""

import pytest
from app.agents.prompts.period_helper import get_default_period
from app.agents.prompts.overtime_prompt import get_overtime_prompt_template, OVERTIME_AGENT_SYSTEM_PROMPT
from app.agents.prompts.attendance_prompt import get_attendance_prompt_template
from app.agents.specialists import filter_unverified_sentences, get_specialist_system_prompt
from app.agents.tools.specialist_tools import get_vendor_breakdown


def test_get_default_period():
    period = get_default_period()
    assert "latest_date" in period
    assert "latest_full_month_start" in period
    assert "latest_full_month_end" in period
    assert "latest_full_month_name" in period
    assert period["latest_date"].startswith("2026-")
    assert period["latest_full_month_start"] <= period["latest_full_month_end"]


def test_overtime_prompt_dynamic_period():
    prompt = get_overtime_prompt_template(
        latest_full_month_start="2026-09-01",
        latest_full_month_end="2026-09-30",
    )
    assert "2026-09-01" in prompt
    assert "2026-09-30" in prompt
    assert "If the user did NOT state a shift, do NOT pass shift_id" in prompt


def test_specialist_prompt_runtime_injection():
    ot_prompt = get_specialist_system_prompt("overtime")
    assert "Runtime Period & Filter Resolution Directives:" in ot_prompt
    assert "If the user does NOT explicitly state a shift, do NOT pass shift_id" in ot_prompt

    att_prompt = get_specialist_system_prompt("attendance")
    assert "attendance_rate_working_days" in att_prompt


def test_vendor_breakdown_contains_new_fields():
    res = get_vendor_breakdown.invoke({})
    assert "contractor_share_of_workforce_pct" in res
    assert "active_contractor_share_pct" in res
    assert "top2_vendor_share_pct" in res
    assert "inactive_count" in res
    assert res["contractor_share_of_workforce_pct"] >= res["active_contractor_share_pct"]
    assert res["inactive_count"] >= 0


def test_filter_unverified_sentences_removes_unverified_numbers():
    tool_trace = [
        {
            "tool": "get_vendor_breakdown",
            "output": {
                "total_workforce": 1700,
                "contractor_share_of_workforce_pct": 38.1,
                "active_contractor_share_pct": 33.7,
                "top2_vendor_share_pct": 39.7,
                "inactive_count": 74,
            },
        }
    ]

    # Sentence containing 51.8% (invented/not in trace) must be filtered
    bad_sent_1 = "These three agencies collectively account for approximately 51.8% of vendor contractor share."
    filtered_1 = filter_unverified_sentences(bad_sent_1, tool_trace, "What is vendor share?")
    assert "51.8%" not in filtered_1

    # Sentence with unverified recommendation percentage 8.4% must be filtered
    bad_rec = "Establish quarterly contractor SLA incentive thresholds to improve punctuality by 8.4%."
    filtered_rec = filter_unverified_sentences(bad_rec, tool_trace, "What is vendor share?")
    assert "8.4%" not in filtered_rec

    # Sentence with unverified range 5-8% must be filtered
    bad_range = "Calibrate Night Shift Standby Pool by 5-8% to cover vacancies."
    filtered_range = filter_unverified_sentences(bad_range, tool_trace, "attendance")
    assert "5-8%" not in filtered_range

    # Sentence with unverified threshold <=16 hrs must be filtered
    bad_thresh = "Enforce Bi-Weekly Overtime Ceiling (<=16 hrs) to prevent fatigue."
    filtered_thresh = filter_unverified_sentences(bad_thresh, tool_trace, "overtime")
    assert "16" not in filtered_thresh

