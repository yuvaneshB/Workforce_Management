"""Unit tests for attendance operational severity calculation."""

import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.agents.attendance_agent_service import compute_attendance_severity


def test_working_days_attendance_84_3_absenteeism_3_9_is_not_critical():
    """Verify: a plant with working-days attendance 84.3%, working absenteeism 3.9% and late rate 5.0% must NOT be CRITICAL."""
    severity = compute_attendance_severity(
        attendance_rate_working_days=84.3,
        working_absenteeism_rate=3.9,
        late_arrival_rate=5.0,
    )
    assert severity != "CRITICAL", f"Expected severity to NOT be CRITICAL, got {severity}"
    assert severity == "MEDIUM", f"Expected MEDIUM severity for 84.3% attendance and 3.9% absenteeism, got {severity}"


def test_attendance_severity_thresholds():
    """Verify numeric thresholds for all severity levels."""
    # Critical due to extreme absenteeism (>= 10.0%)
    assert compute_attendance_severity(85.0, 10.5, 3.0) == "CRITICAL"
    # Critical due to severe attendance collapse (< 70.0%)
    assert compute_attendance_severity(68.0, 4.0, 3.0) == "CRITICAL"

    # High due to elevated absenteeism (>= 7.0%)
    assert compute_attendance_severity(88.0, 7.5, 3.0) == "HIGH"
    # High due to low attendance (< 78.0%)
    assert compute_attendance_severity(77.0, 4.0, 3.0) == "HIGH"

    # Medium due to moderate attendance (< 92.0%) with healthy absenteeism
    assert compute_attendance_severity(89.0, 3.5, 3.0) == "MEDIUM"
    # Medium due to absenteeism >= 4.5%
    assert compute_attendance_severity(93.0, 4.8, 3.0) == "MEDIUM"

    # Low: healthy attendance (>= 92.0%) and low absenteeism (< 4.5%)
    assert compute_attendance_severity(94.5, 3.2, 4.0) == "LOW"

