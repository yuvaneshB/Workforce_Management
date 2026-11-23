"""Unit tests for Workforce Intelligence Service (Phase 7.1).

Validates:
1. Single-person dependency risk flagged when available_count <= threshold (default 1, pending approval).
2. Unavailable attendance statuses (ABSENT, LEAVE) not counted in available_count, while PRESENT and LATE are counted.
3. Unconfigured labor limits (None) return "rule not approved" without flagging false exceptions.
4. Rest turnaround interval conflicts are flagged as exceptions.
"""

import datetime as dt
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import Settings
from app.services import intelligence_service


@pytest.fixture
def mock_db():
    """Create a mocked SQLAlchemy session."""
    session = MagicMock()
    return session


def test_dependency_risk_flagged_when_below_or_at_threshold(mock_db):
    """Verify that roles with available staff <= DEPENDENCY_BACKUP_THRESHOLD (1) are flagged as HIGH risk."""
    target_date = dt.date(2026, 8, 1)

    # 2 active employees for the same role + certification
    active_employees = [
        {
            "employee_id": "EMP-001",
            "role": "CNC Specialist",
            "certification": "CNC-Level-3",
            "home_shift": "A",
            "plant_id": "IN-KA-01",
        },
        {
            "employee_id": "EMP-002",
            "role": "CNC Specialist",
            "certification": "CNC-Level-3",
            "home_shift": "A",
            "plant_id": "IN-KA-01",
        },
    ]
    # Only EMP-001 is present; EMP-002 is absent -> available_count = 1 <= threshold 1 -> HIGH risk
    attendance_records = [
        {
            "employee_id": "EMP-001",
            "attendance_status": "PRESENT",
            "shift_id": "A",
        },
        {
            "employee_id": "EMP-002",
            "attendance_status": "ABSENT",
            "shift_id": "A",
        },
    ]

    mock_db.execute.return_value.mappings.return_value.all.side_effect = [
        active_employees,
        attendance_records,
    ]

    result = intelligence_service.get_single_person_dependency(
        mock_db,
        plant_id="IN-KA-01",
        shift_id="A",
        date=target_date,
    )

    assert result["status"] == "success"
    assert result["threshold"] == 1
    assert result["threshold_status"] == "pending approval"
    assert result["requires_supervisor_hr_review"] is True
    assert "role+certification" in result["skill_proxy_note"].lower() or "proxy for skill" in result["skill_proxy_note"].lower()
    assert result["source"] == "calculated_metric"

    assert len(result["rows"]) == 1
    row = result["rows"][0]
    assert row["role"] == "CNC Specialist"
    assert row["qualified"] == 2
    assert row["available"] == 1
    assert row["risk_level"] == "HIGH"
    assert "cross-train / identify backup" in row["suggested_mitigation"]


def test_unavailable_attendance_status_not_counted_in_availability(mock_db):
    """Verify that ABSENT and LEAVE statuses are NOT counted as available, while PRESENT and LATE are."""
    target_date = dt.date(2026, 8, 1)

    active_employees = [
        {"employee_id": "EMP-001", "role": "Assembly Tech", "certification": "None", "home_shift": "A", "plant_id": "IN-KA-01"},
        {"employee_id": "EMP-002", "role": "Assembly Tech", "certification": "None", "home_shift": "A", "plant_id": "IN-KA-01"},
        {"employee_id": "EMP-003", "role": "Assembly Tech", "certification": "None", "home_shift": "A", "plant_id": "IN-KA-01"},
        {"employee_id": "EMP-004", "role": "Assembly Tech", "certification": "None", "home_shift": "A", "plant_id": "IN-KA-01"},
    ]

    attendance_records = [
        {"employee_id": "EMP-001", "attendance_status": "PRESENT", "shift_id": "A"},
        {"employee_id": "EMP-002", "attendance_status": "LATE", "shift_id": "A"},
        {"employee_id": "EMP-003", "attendance_status": "ABSENT", "shift_id": "A"},
        {"employee_id": "EMP-004", "attendance_status": "LEAVE", "shift_id": "A"},
    ]

    mock_db.execute.return_value.mappings.return_value.all.side_effect = [
        active_employees,
        attendance_records,
    ]

    result = intelligence_service.get_single_person_dependency(
        mock_db,
        plant_id="IN-KA-01",
        shift_id="A",
        date=target_date,
    )

    assert len(result["rows"]) == 1
    row = result["rows"][0]
    assert row["qualified"] == 4
    # Available should be 2 (EMP-001 PRESENT + EMP-002 LATE); ABSENT and LEAVE excluded
    assert row["available"] == 2
    assert row["risk_level"] == "LOW"


def test_unconfigured_limits_return_rule_not_approved_without_exceptions(mock_db):
    """Verify that when MAX_OVERTIME_HOURS_PER_DAY and MAX_HOURS_PER_WEEK are None,

    the audit marks rules as not approved and does NOT flag false exceptions.
    """
    target_date = dt.date(2026, 8, 1)

    # Attendance records with heavy overtime and high actual hours
    attendance_records = [
        {
            "attendance_id": "ATT-001",
            "employee_id": "EMP-001",
            "work_date": target_date,
            "plant_id": "IN-KA-01",
            "shift_id": "A",
            "scheduled_hours": 8,
            "actual_hours": 14,
            "overtime_hours": 6,
            "attendance_status": "PRESENT",
        }
    ]

    mock_db.execute.return_value.mappings.return_value.all.return_value = attendance_records

    # Ensure settings have limits set to None
    with patch("app.services.intelligence_service.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            MAX_OVERTIME_HOURS_PER_DAY=None,
            MAX_HOURS_PER_WEEK=None,
        )

        result = intelligence_service.get_labour_compliance(
            mock_db,
            plant_id="IN-KA-01",
            date=target_date,
        )

    assert result["status"] == "success"
    assert result["requires_supervisor_hr_review"] is True
    # Unconfigured rules recorded
    assert any("MAX_OVERTIME_HOURS_PER_DAY" in r for r in result["rules_not_configured"])
    assert any("MAX_HOURS_PER_WEEK" in r for r in result["rules_not_configured"])
    # No overtime or weekly exceptions should be flagged because the rule is not approved
    overtime_exceptions = [e for e in result["exceptions"] if "overtime" in e["rule"].lower()]
    weekly_exceptions = [e for e in result["exceptions"] if "weekly" in e["rule"].lower()]
    assert len(overtime_exceptions) == 0
    assert len(weekly_exceptions) == 0


def test_rest_turnaround_conflict_flagged_as_exception(mock_db):
    """Verify that consecutive shifts violating rest turnaround interval (e.g. C -> A) trigger an exception."""
    day1 = dt.date(2026, 8, 1)
    day2 = dt.date(2026, 8, 2)

    # EMP-001 works Shift C on day 1 (ends 06:00) then Shift A on day 2 (starts 06:00) -> 0h rest turnaround conflict
    attendance_records = [
        {
            "attendance_id": "ATT-001",
            "employee_id": "EMP-001",
            "work_date": day1,
            "plant_id": "IN-KA-01",
            "shift_id": "C",
            "scheduled_hours": 8,
            "actual_hours": 8,
            "overtime_hours": 0,
            "attendance_status": "PRESENT",
        },
        {
            "attendance_id": "ATT-002",
            "employee_id": "EMP-001",
            "work_date": day2,
            "plant_id": "IN-KA-01",
            "shift_id": "A",
            "scheduled_hours": 8,
            "actual_hours": 8,
            "overtime_hours": 0,
            "attendance_status": "PRESENT",
        },
    ]

    mock_db.execute.return_value.mappings.return_value.all.return_value = attendance_records

    result = intelligence_service.get_labour_compliance(
        mock_db,
        plant_id="IN-KA-01",
        start_date=day1,
        end_date=day2,
    )

    turnaround_exceptions = [e for e in result["exceptions"] if e["rule"] == "Rest Turnaround Interval"]
    assert len(turnaround_exceptions) == 1
    assert turnaround_exceptions[0]["employee_id"] == "EMP-001"
    assert "Turnaround conflict" in turnaround_exceptions[0]["detail"]


def test_api_endpoints_registered_and_accessible():
    """Verify that GET /single-person-dependency and GET /labour-compliance endpoints are live."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    with patch("app.services.intelligence_service.get_single_person_dependency") as mock_dep:
        mock_dep.return_value = {
            "status": "success",
            "rows": [],
            "data_limitations": ["Test limitation"],
            "source": "calculated_metric",
        }
        res = client.get("/api/v1/intelligence/single-person-dependency?date=2026-08-01")
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    with patch("app.services.intelligence_service.get_labour_compliance") as mock_comp:
        mock_comp.return_value = {
            "status": "success",
            "exceptions": [],
            "rules_applied": ["Rule 1"],
            "rules_not_configured": [],
            "data_limitations": ["Test limitation"],
            "source": "calculated_metric",
        }
        res = client.get("/api/v1/intelligence/labour-compliance?date=2026-08-01")
        assert res.status_code == 200
        assert res.json()["status"] == "success"

