"""Focused unit tests for Core Workforce LangChain Tools (Phase 6.2)."""

import datetime as dt
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from app.agents.tools.workforce_tools import (
    get_attendance_analytics,
    get_department_analytics,
    get_experience_analytics,
    get_section_analytics,
    get_shift_analytics,
    get_workforce_summary,
    tool_registry,
)


@contextmanager
def _mock_db_session():
    """Mock context manager simulating a database session."""
    yield MagicMock()


# Fixture patching database session for all tool tests
@pytest.fixture(autouse=True)
def mock_tool_db():
    with patch(
        "app.agents.tools.workforce_tools._get_tool_db_session",
        side_effect=_mock_db_session,
    ):
        yield


def test_tool_registration():
    """Verify that all 6 tools are registered in WorkforceToolRegistry with correct schemas."""
    tools = tool_registry.get_registered_tools()
    tool_names = tool_registry.get_tool_names()

    assert len(tools) >= 6
    assert "get_workforce_summary" in tool_names
    assert "get_attendance_analytics" in tool_names
    assert "get_department_analytics" in tool_names
    assert "get_shift_analytics" in tool_names
    assert "get_experience_analytics" in tool_names
    assert "get_section_analytics" in tool_names

    summary_tool = tool_registry.get_tool("get_workforce_summary")
    assert summary_tool is not None
    assert "headcount" in summary_tool.description.lower() or "workforce" in summary_tool.description.lower()

    attendance_tool = tool_registry.get_tool("get_attendance_analytics")
    assert attendance_tool is not None
    assert "start_date" in attendance_tool.args
    assert "end_date" in attendance_tool.args
    assert "shift_id" in attendance_tool.args

    dept_tool = tool_registry.get_tool("get_department_analytics")
    assert dept_tool is not None
    assert "start_date" in dept_tool.args
    assert "end_date" in dept_tool.args
    assert "shift_id" in dept_tool.args

    shift_tool = tool_registry.get_tool("get_shift_analytics")
    assert shift_tool is not None
    assert "shift" in shift_tool.description.lower()

    exp_tool = tool_registry.get_tool("get_experience_analytics")
    assert exp_tool is not None
    assert "experience" in exp_tool.description.lower()

    sec_tool = tool_registry.get_tool("get_section_analytics")
    assert sec_tool is not None
    assert "section" in sec_tool.description.lower()


def test_get_workforce_summary_success():
    """Verify get_workforce_summary extracts total_employees, active_employees, and team_count."""
    mock_summary = MagicMock(
        total_employees=180,
        active_employees=180,
        distinct_teams=6,
    )
    with patch(
        "app.agents.tools.workforce_tools.workforce_service.get_workforce_summary",
        return_value=mock_summary,
    ) as mock_svc:
        result = get_workforce_summary.invoke({})
        assert mock_svc.called
        assert result["status"] == "success"
        assert result["total_employees"] == 180
        assert result["active_employees"] == 180
        assert result["team_count"] == 6


def test_get_workforce_summary_database_error():
    """Verify get_workforce_summary handles database errors gracefully without unhandled exceptions."""
    with patch(
        "app.agents.tools.workforce_tools.workforce_service.get_workforce_summary",
        side_effect=Exception("Neon connection timed out"),
    ):
        result = get_workforce_summary.invoke({})
        assert result["status"] == "error"
        assert result["error_type"] == "DatabaseError"
        assert "Neon connection timed out" in result["message"]


def test_get_attendance_analytics_success_and_preservation_of_statuses():
    """Verify get_attendance_analytics preserves PRESENT, ABSENT, LEAVE, and LATE separately."""
    mock_item_present = MagicMock(attendance_status="PRESENT", record_count=15139)
    mock_item_absent = MagicMock(attendance_status="ABSENT", record_count=554)
    mock_item_leave = MagicMock(attendance_status="LEAVE", record_count=475)
    mock_item_late = MagicMock(attendance_status="LATE", record_count=392)

    mock_analytics = MagicMock(
        total_records=16560,
        by_status=[
            mock_item_present,
            mock_item_absent,
            mock_item_leave,
            mock_item_late,
        ],
    )

    with patch(
        "app.agents.tools.workforce_tools.attendance_service.get_attendance_analytics",
        return_value=mock_analytics,
    ):
        result = get_attendance_analytics.invoke({})
        assert result["status"] == "success"
        assert result["total_records"] == 16560
        assert result["present_count"] == 15139
        assert result["absent_count"] == 554
        assert result["leave_count"] == 475
        assert result["late_count"] == 392

        # LEAVE and LATE must not be classified as ABSENT
        assert result["absent_count"] != (554 + 475 + 392)

        # Formula checks: 15139 / 16560 * 100 = 91.4%
        assert result["attendance_percentage"] == 91.4
        # Formula checks: 554 / 16560 * 100 = 3.3%
        assert result["absenteeism_percentage"] == 3.3


def test_get_attendance_analytics_filters():
    """Verify optional date and shift filters are parsed, passed to service, and returned in filters_applied."""
    mock_analytics = MagicMock(total_records=1800, by_status=[])

    with patch(
        "app.agents.tools.workforce_tools.attendance_service.get_attendance_analytics",
        return_value=mock_analytics,
    ) as mock_svc:
        result = get_attendance_analytics.invoke(
            {
                "start_date": "2026-08-01",
                "end_date": "2026-08-31",
                "shift_id": "a",
            }
        )
        assert mock_svc.called
        kwargs = mock_svc.call_args.kwargs
        assert kwargs["start_date"] == dt.date(2026, 8, 1)
        assert kwargs["end_date"] == dt.date(2026, 8, 31)
        assert kwargs["shift_id"] == "A"

        assert result["filters_applied"]["start_date"] == "2026-08-01"
        assert result["filters_applied"]["end_date"] == "2026-08-31"
        assert result["filters_applied"]["shift_id"] == "A"


def test_get_attendance_analytics_empty_results():
    """Verify get_attendance_analytics handles 0 records without ZeroDivisionError."""
    mock_analytics = MagicMock(total_records=0, by_status=[])

    with patch(
        "app.agents.tools.workforce_tools.attendance_service.get_attendance_analytics",
        return_value=mock_analytics,
    ):
        result = get_attendance_analytics.invoke({})
        assert result["status"] == "success"
        assert result["total_records"] == 0
        assert result["present_count"] == 0
        assert result["absent_count"] == 0
        assert result["attendance_percentage"] == 0.0
        assert result["absenteeism_percentage"] == 0.0


def test_get_attendance_analytics_invalid_arguments():
    """Verify get_attendance_analytics validates date formats and invalid date ranges."""
    # Invalid date format
    bad_date_res = get_attendance_analytics.invoke({"start_date": "2026-99-99"})
    assert bad_date_res["status"] == "error"
    assert bad_date_res["error_type"] == "ValidationError"
    assert "Invalid date format" in bad_date_res["message"]

    # Inverted date window
    inverted_res = get_attendance_analytics.invoke(
        {"start_date": "2026-10-31", "end_date": "2026-08-01"}
    )
    assert inverted_res["status"] == "error"
    assert inverted_res["error_type"] == "ValidationError"
    assert "cannot be after end_date" in inverted_res["message"]


def test_get_attendance_analytics_database_error():
    """Verify get_attendance_analytics handles database exceptions safely."""
    with patch(
        "app.agents.tools.workforce_tools.attendance_service.get_attendance_analytics",
        side_effect=Exception("Database lock timeout"),
    ):
        result = get_attendance_analytics.invoke({})
        assert result["status"] == "error"
        assert result["error_type"] == "DatabaseError"
        assert "Database lock timeout" in result["message"]


def test_get_department_analytics_success():
    """Verify get_department_analytics returns department headcount, present, absent, and percentages."""
    mock_dept_1 = MagicMock(
        department_id="DEPT-01",
        department_name="Production",
        employee_count=54,
        present_count=4940,
        absent_count=180,
        attendance_pct=91.4,
        absenteeism_pct=3.3,
    )
    mock_dept_2 = MagicMock(
        department_id="DEPT-02",
        department_name="Quality",
        employee_count=28,
        present_count=2350,
        absent_count=85,
        attendance_pct=91.5,
        absenteeism_pct=3.3,
    )
    mock_response = MagicMock(
        total_departments=2,
        items=[mock_dept_1, mock_dept_2],
    )

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_department_analytics",
        return_value=mock_response,
    ):
        result = get_department_analytics.invoke(
            {
                "start_date": "2026-08-01",
                "end_date": "2026-10-31",
                "shift_id": "B",
            }
        )
        assert result["status"] == "success"
        assert result["total_departments"] == 2
        assert len(result["departments"]) == 2

        dept1 = result["departments"][0]
        assert dept1["department_id"] == "DEPT-01"
        assert dept1["department_name"] == "Production"
        assert dept1["headcount"] == 54
        assert dept1["present_count"] == 4940
        assert dept1["absent_count"] == 180
        assert dept1["attendance_percentage"] == 91.4
        assert dept1["absenteeism_percentage"] == 3.3

        assert result["filters_applied"]["shift_id"] == "B"


def test_get_department_analytics_empty_results():
    """Verify get_department_analytics handles empty department items cleanly."""
    mock_response = MagicMock(total_departments=0, items=[])

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_department_analytics",
        return_value=mock_response,
    ):
        result = get_department_analytics.invoke({})
        assert result["status"] == "success"
        assert result["total_departments"] == 0
        assert result["departments"] == []


def test_get_department_analytics_invalid_arguments_and_db_error():
    """Verify get_department_analytics catches invalid dates and database errors."""
    bad_res = get_department_analytics.invoke({"end_date": "not-a-date"})
    assert bad_res["status"] == "error"
    assert bad_res["error_type"] == "ValidationError"

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_department_analytics",
        side_effect=Exception("Readonly query error"),
    ):
        error_res = get_department_analytics.invoke({})
        assert error_res["status"] == "error"
        assert error_res["error_type"] == "DatabaseError"
        assert "Readonly query error" in error_res["message"]


def test_get_shift_analytics_success():
    """Verify get_shift_analytics extracts headcount and attendance metrics per shift."""
    mock_summary = MagicMock(
        by_home_shift=[
            MagicMock(key="A", count=60),
            MagicMock(key="B", count=60),
            MagicMock(key="C", count=60),
        ]
    )
    mock_att = MagicMock(
        shift_breakdown=[
            MagicMock(
                shift_id="A",
                total_records=5520,
                present_count=4850,
                absent_count=210,
                attendance_pct=87.9,
                absenteeism_pct=3.8,
            ),
            MagicMock(
                shift_id="B",
                total_records=5520,
                present_count=4980,
                absent_count=180,
                attendance_pct=90.2,
                absenteeism_pct=3.3,
            ),
        ]
    )

    with patch(
        "app.agents.tools.workforce_tools.workforce_service.get_workforce_summary",
        return_value=mock_summary,
    ), patch(
        "app.agents.tools.workforce_tools.attendance_service.get_attendance_analytics",
        return_value=mock_att,
    ):
        result = get_shift_analytics.invoke({"shift_id": "A"})
        assert result["status"] == "success"
        assert result["total_shifts"] == 2
        shift_a = result["shifts"][0]
        assert shift_a["shift_id"] == "A"
        assert shift_a["headcount"] == 60
        assert shift_a["present_count"] == 4850
        assert shift_a["absent_count"] == 210
        assert shift_a["attendance_percentage"] == 87.9
        assert shift_a["absenteeism_percentage"] == 3.8


def test_get_shift_analytics_validation_and_db_error():
    """Verify get_shift_analytics handles validation errors and DB exceptions."""
    bad_res = get_shift_analytics.invoke({"start_date": "2026-10-01", "end_date": "2026-09-01"})
    assert bad_res["status"] == "error"
    assert bad_res["error_type"] == "ValidationError"

    with patch(
        "app.agents.tools.workforce_tools.workforce_service.get_workforce_summary",
        side_effect=RuntimeError("Connection lost"),
    ):
        error_res = get_shift_analytics.invoke({})
        assert error_res["status"] == "error"
        assert error_res["error_type"] == "DatabaseError"
        assert "Connection lost" in error_res["message"]


def test_get_experience_analytics_success():
    """Verify get_experience_analytics parses experience tiers and rates."""
    mock_exp = MagicMock(
        items=[
            MagicMock(
                category="0–1 Years",
                employee_count=22,
                present_count=1800,
                absent_count=90,
                total_records=2000,
                attendance_pct=90.0,
                absenteeism_pct=4.5,
            ),
            MagicMock(
                category="1–3 Years",
                employee_count=45,
                present_count=4100,
                absent_count=150,
                total_records=4500,
                attendance_pct=91.1,
                absenteeism_pct=3.3,
            ),
        ]
    )

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_experience_analytics",
        return_value=mock_exp,
    ):
        result = get_experience_analytics.invoke({})
        assert result["status"] == "success"
        assert result["total_categories"] == 2
        tier1 = result["experience_tiers"][0]
        assert tier1["category"] == "0–1 Years"
        assert tier1["employee_count"] == 22
        assert tier1["attendance_percentage"] == 90.0
        assert tier1["absenteeism_percentage"] == 4.5


def test_get_experience_analytics_validation_and_db_error():
    """Verify get_experience_analytics validates inputs and handles errors."""
    bad_res = get_experience_analytics.invoke({"start_date": "invalid-date"})
    assert bad_res["status"] == "error"
    assert bad_res["error_type"] == "ValidationError"

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_experience_analytics",
        side_effect=Exception("DB Failure"),
    ):
        error_res = get_experience_analytics.invoke({})
        assert error_res["status"] == "error"
        assert error_res["error_type"] == "DatabaseError"


def test_get_section_analytics_success():
    """Verify get_section_analytics formats section breakdown properly."""
    mock_sec = MagicMock(
        total_sections=2,
        items=[
            MagicMock(
                section_id="SEC-01",
                section_name="SMT-Line-1",
                employee_count=30,
                present_count=2700,
                absent_count=80,
                total_records=2900,
                attendance_pct=93.1,
                absenteeism_pct=2.8,
            ),
            MagicMock(
                section_id="SEC-02",
                section_name="Testing-Bay",
                employee_count=25,
                present_count=2200,
                absent_count=70,
                total_records=2400,
                attendance_pct=91.7,
                absenteeism_pct=2.9,
            ),
        ],
    )

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_section_analytics",
        return_value=mock_sec,
    ):
        result = get_section_analytics.invoke({})
        assert result["status"] == "success"
        assert result["total_sections"] == 2
        sec1 = result["sections"][0]
        assert sec1["section_id"] == "SEC-01"
        assert sec1["section_name"] == "SMT-Line-1"
        assert sec1["headcount"] == 30
        assert sec1["attendance_percentage"] == 93.1
        assert sec1["absenteeism_percentage"] == 2.8


def test_get_section_analytics_validation_and_db_error():
    """Verify get_section_analytics validates date input and handles exceptions."""
    bad_res = get_section_analytics.invoke({"end_date": "not-a-valid-date"})
    assert bad_res["status"] == "error"
    assert bad_res["error_type"] == "ValidationError"

    with patch(
        "app.agents.tools.workforce_tools.workforce_analytics_service.get_section_analytics",
        side_effect=Exception("Read failure"),
    ):
        error_res = get_section_analytics.invoke({})
        assert error_res["status"] == "error"
        assert error_res["error_type"] == "DatabaseError"

