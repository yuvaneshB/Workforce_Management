"""Targeted tests for get_employee_details and get_recent_joiners specialist tools."""

import json
import pytest
from sqlalchemy import text
from app.agents.tools.specialist_tools import (
    get_employee_details,
    get_recent_joiners,
)
from app.agents.tools.workforce_tools import _get_tool_db_session


def test_get_employee_details_returns_trimmed_valid_json():
    """Verify get_employee_details returns valid trimmed JSON under 3 KB with all required keys."""
    # 1. Search by known ID
    res_id = get_employee_details.invoke({"employee_id": "EMP-10001"})
    assert isinstance(res_id, dict)
    assert res_id.get("status") == "success"
    assert res_id.get("count") >= 1
    
    match = res_id["matches"][0]
    required_keys = [
        "employee_id",
        "name",
        "plant",
        "department",
        "section",
        "designation",
        "employment_type",
        "vendor",
        "shift",
        "skill_grade",
        "date_of_joining",
        "tenure_band",
        "status",
    ]
    for key in required_keys:
        assert key in match, f"Missing key {key} in match"
        assert match[key] is not None

    # Verify JSON output size is under 3 KB
    serialized = json.dumps(res_id)
    assert len(serialized.encode("utf-8")) < 3072, f"Output exceeds 3 KB: {len(serialized.encode('utf-8'))} bytes"

    # 2. Search by case-insensitive partial name
    res_name = get_employee_details.invoke({"name": "sumathi"})
    assert res_name.get("status") == "success"
    assert res_name.get("count") >= 1
    assert "sumathi" in res_name["matches"][0]["name"].lower()


def test_get_employee_details_handles_unknown():
    """Verify get_employee_details handles unknown ID and unknown name gracefully without error."""
    res_unknown_id = get_employee_details.invoke({"employee_id": "EMP-9999999"})
    assert res_unknown_id.get("status") == "not_found"
    assert len(res_unknown_id.get("matches", [])) == 0

    res_unknown_name = get_employee_details.invoke({"name": "NonExistentPersonName123"})
    assert res_unknown_name.get("status") == "not_found"
    assert len(res_unknown_name.get("matches", [])) == 0

    res_empty = get_employee_details.invoke({})
    assert res_empty.get("status") == "error"


def test_get_recent_joiners_returns_trimmed_valid_json():
    """Verify get_recent_joiners returns count and top 10 employees under 3 KB."""
    res = get_recent_joiners.invoke({"days": 90})
    assert isinstance(res, dict)
    assert res.get("status") == "success"
    assert "recent_joiners_in_window_count" in res
    assert "total_new_joiners_cohort_count" in res
    assert "latest_joiners" in res
    assert len(res["latest_joiners"]) <= 10

    if res["latest_joiners"]:
        first = res["latest_joiners"][0]
        for key in ["employee_id", "name", "plant", "department", "designation", "employment_type", "date_of_joining"]:
            assert key in first

    serialized = json.dumps(res)
    assert len(serialized.encode("utf-8")) < 3072, f"Output exceeds 3 KB: {len(serialized.encode('utf-8'))} bytes"


def test_tools_are_strictly_read_only_no_write_possible():
    """Verify tools operate on read-only session and cannot write/commit mutations."""
    with _get_tool_db_session() as session:
        # Check that session cannot commit modifications or execute forbidden writes without rollback
        with pytest.raises(Exception):
            session.execute(text("INSERT INTO public.employee_master (employee_id) VALUES ('FAIL')"))
            session.commit()

