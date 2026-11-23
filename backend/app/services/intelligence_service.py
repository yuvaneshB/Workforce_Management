"""Workforce Intelligence Service (Phase 7.1).

Provides read-only operational intelligence capabilities:
1. Single-Person Dependency Risk Analysis
2. Labour & Regulatory Compliance Auditing
"""

import datetime as dt
import logging
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.attendance import WorkforceAttendance
from app.models.workforce import Workforce
from app.services.workforce_planning_service import _check_rest_turnaround

logger = logging.getLogger(__name__)

SHIFT_MAP = {
    "GS1": "A",
    "S2": "B",
    "NS3": "C",
    "A": "A",
    "B": "B",
    "C": "C",
}
DISPLAY_SHIFT_MAP = {
    "A": "GS1 (A)",
    "B": "S2 (B)",
    "C": "NS3 (C)",
}


def normalize_shift(shift: str | None) -> str | None:
    """Normalize shift parameter to canonical single letter ('A', 'B', 'C')."""
    if not shift or not str(shift).strip():
        return None
    cleaned = str(shift).strip().upper()
    return SHIFT_MAP.get(cleaned, cleaned)


def format_shift_display(shift: str | None) -> str:
    """Format shift for user display as GS1 (A), S2 (B), NS3 (C)."""
    if not shift:
        return "All Shifts"
    normalized = normalize_shift(shift)
    return DISPLAY_SHIFT_MAP.get(normalized, shift)


def get_latest_attendance_date(db: Session) -> dt.date:
    """Retrieve the latest work_date available in fact_workforce_attendance."""
    try:
        stmt = select(func.max(WorkforceAttendance.work_date))
        max_date = db.execute(stmt).scalar()
        if max_date is not None:
            if isinstance(max_date, dt.date):
                return max_date
            if isinstance(max_date, str):
                return dt.date.fromisoformat(max_date)
    except Exception as err:
        logger.warning("Could not query max attendance work_date: %s", err)
    return dt.date(2026, 8, 1)


def _resolve_date(date_val: dt.date | str | None, db: Session) -> dt.date:
    """Safely parse or resolve target date, falling back to latest DB date."""
    if date_val is None:
        return get_latest_attendance_date(db)
    if isinstance(date_val, dt.date):
        return date_val
    if isinstance(date_val, str):
        cleaned = date_val.strip()
        if not cleaned or cleaned.lower() == "today":
            return get_latest_attendance_date(db)
        try:
            return dt.date.fromisoformat(cleaned)
        except ValueError:
            return get_latest_attendance_date(db)
    return get_latest_attendance_date(db)


def get_single_person_dependency(
    db: Session,
    plant_id: str | None = None,
    shift_id: str | None = None,
    date: dt.date | str | None = None,
) -> dict[str, Any]:
    """Analyze single-person dependency risks across plant roles and certifications.

    Groups active employees (dim_workforce) by plant + role + certification (role+certification is
    the skill proxy). For the selected date/shift, calculates qualified_count and available_count
    (attendance status PRESENT or LATE; ABSENT or LEAVE are not available).
    Flags dependency risk if available_count <= DEPENDENCY_BACKUP_THRESHOLD (pending approval).
    """
    settings = get_settings()
    threshold = settings.dependency_backup_threshold
    target_date = _resolve_date(date, db)
    canonical_shift = normalize_shift(shift_id)

    # Query active employees directly from EmployeeMaster
    active_stmt = (
        select(
            Workforce.employee_id,
            Workforce.role,
            func.coalesce(Workforce.grade, "L1").label("certification"),
            Workforce.home_shift,
            Workforce.plant_id,
        )
        .where(func.lower(Workforce.employment_status) == "active")
    )

    if plant_id:
        active_stmt = active_stmt.where(Workforce.plant_id == plant_id)
    if canonical_shift:
        active_stmt = active_stmt.where(Workforce.home_shift == canonical_shift)

    active_records = db.execute(active_stmt).mappings().all()

    # 2. Query attendance for target_date to evaluate availability
    att_stmt = select(
        WorkforceAttendance.employee_id,
        WorkforceAttendance.attendance_status,
        WorkforceAttendance.shift_id,
    ).where(WorkforceAttendance.work_date == target_date)

    if plant_id:
        att_stmt = att_stmt.where(WorkforceAttendance.plant_id == plant_id)
    if canonical_shift:
        att_stmt = att_stmt.where(WorkforceAttendance.shift_id == canonical_shift)

    attendance_rows = db.execute(att_stmt).mappings().all()
    # Build attendance map: employee_id -> attendance_status
    attendance_map: dict[str, str] = {
        row["employee_id"]: (row["attendance_status"] or "").upper()
        for row in attendance_rows
    }

    # 3. Group by plant + role + certification
    # Key: (plant, role, cert) -> list of employee profiles
    grouped: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for emp in active_records:
        key = (
            emp["plant_id"] or "Unknown",
            emp["role"] or "Unknown",
            emp["certification"] or "None",
        )
        grouped.setdefault(key, []).append(emp)

    rows: list[dict[str, Any]] = []
    for (p_id, r_name, cert_name), members in grouped.items():
        qualified_count = len(members)
        # available: status is PRESENT or LATE
        available_count = 0
        for m in members:
            status = attendance_map.get(m["employee_id"])
            if status in ("PRESENT", "LATE"):
                available_count += 1

        is_risk = available_count <= threshold
        risk_level = "HIGH" if is_risk else "LOW"

        if is_risk:
            explanation = (
                f"Single-person dependency risk: only {available_count} available operator(s) "
                f"for {r_name} with {cert_name} (threshold <= {threshold}, pending approval)."
            )
            mitigation = "cross-train / identify backup"
        else:
            explanation = (
                f"Adequate staffing backup: {available_count} of {qualified_count} "
                f"qualified operators available (threshold <= {threshold})."
            )
            mitigation = "cross-train / identify backup"

        rows.append({
            "plant": p_id,
            "role": r_name,
            "certification": cert_name,
            "qualified": qualified_count,
            "available": available_count,
            "risk_level": risk_level,
            "explanation": explanation,
            "suggested_mitigation": mitigation,
            "source": "calculated_metric",
        })

    # Sort HIGH risk first, then plant, role, certification
    rows.sort(key=lambda x: (0 if x["risk_level"] == "HIGH" else 1, x["plant"], x["role"], x["certification"]))

    high_risk_count = sum(1 for r in rows if r["risk_level"] == "HIGH")

    return {
        "status": "success",
        "analysis_type": "single_person_dependency",
        "target_date": target_date.isoformat(),
        "filters": {
            "plant_id": plant_id,
            "shift_id": canonical_shift,
            "date": target_date.isoformat(),
        },
        "threshold": threshold,
        "threshold_status": "pending approval",
        "skill_proxy_note": "Role + certification is used as the proxy for skill.",
        "requires_supervisor_hr_review": True,
        "total_roles_evaluated": len(rows),
        "high_risk_count": high_risk_count,
        "rows": rows,
        "data_limitations": [
            "Role + certification is used as a proxy for skill because a dedicated skill matrix is not configured.",
            f"Dependency backup threshold is currently set to {threshold} and is pending management/HR approval.",
            "Availability reflects PRESENT and LATE workers on the selected shift; ABSENT and LEAVE are excluded.",
        ],
        "source": "calculated_metric",
    }


def get_labour_compliance(
    db: Session,
    plant_id: str | None = None,
    shift_id: str | None = None,
    start_date: dt.date | str | None = None,
    end_date: dt.date | str | None = None,
    date: dt.date | str | None = None,
) -> dict[str, Any]:
    """Audit workforce attendance for labor compliance, overtime limits, and turnaround rest intervals.

    Limits come ONLY from config (MAX_OVERTIME_HOURS_PER_DAY, MAX_HOURS_PER_WEEK).
    If a limit is None, returns 'rule not approved' for that check and does NOT flag exceptions for it.
    Uses existing _check_rest_turnaround from workforce_planning_service for rest interval checks.
    """
    settings = get_settings()
    canonical_shift = normalize_shift(shift_id)

    # Resolve date boundaries
    if date is not None:
        s_date = _resolve_date(date, db)
        e_date = s_date
    else:
        if start_date is not None and end_date is not None:
            s_date = _resolve_date(start_date, db)
            e_date = _resolve_date(end_date, db)
        elif start_date is not None:
            s_date = _resolve_date(start_date, db)
            e_date = s_date
        elif end_date is not None:
            e_date = _resolve_date(end_date, db)
            s_date = e_date
        else:
            latest = get_latest_attendance_date(db)
            s_date = latest
            e_date = latest

    if s_date > e_date:
        s_date, e_date = e_date, s_date

    rules_applied: list[str] = [
        "Rest turnaround interval verification (minimum 8-hour rest interval between consecutive shifts)"
    ]
    rules_not_configured: list[str] = []

    # Check daily overtime configuration
    max_ot_day = settings.max_overtime_hours_per_day
    if max_ot_day is None:
        rules_not_configured.append("MAX_OVERTIME_HOURS_PER_DAY (daily overtime limit not approved)")
    else:
        rules_applied.append(f"MAX_OVERTIME_HOURS_PER_DAY (maximum {max_ot_day}h overtime per day)")

    # Check weekly hours configuration
    max_hrs_week = settings.max_hours_per_week
    if max_hrs_week is None:
        rules_not_configured.append("MAX_HOURS_PER_WEEK (weekly hours limit not approved)")
    else:
        rules_applied.append(f"MAX_HOURS_PER_WEEK (maximum {max_hrs_week}h per week)")

    # Query attendance records in the window (include previous day for turnaround check if window starts on s_date)
    query_start = s_date - dt.timedelta(days=1)
    stmt = (
        select(
            WorkforceAttendance.attendance_id,
            WorkforceAttendance.employee_id,
            WorkforceAttendance.work_date,
            WorkforceAttendance.plant_id,
            WorkforceAttendance.shift_id,
            WorkforceAttendance.scheduled_hours,
            WorkforceAttendance.actual_hours,
            WorkforceAttendance.overtime_hours,
            WorkforceAttendance.attendance_status,
        )
        .where(
            and_(
                WorkforceAttendance.work_date >= query_start,
                WorkforceAttendance.work_date <= e_date,
            )
        )
        .order_by(
            WorkforceAttendance.employee_id,
            WorkforceAttendance.work_date,
            WorkforceAttendance.shift_id,
        )
    )

    if plant_id:
        stmt = stmt.where(WorkforceAttendance.plant_id == plant_id)

    raw_records = db.execute(stmt).mappings().all()

    exceptions: list[dict[str, Any]] = []

    # Check configured rules on records within [s_date, e_date]
    records_in_window = [r for r in raw_records if s_date <= r["work_date"] <= e_date]
    if canonical_shift:
        records_in_window = [r for r in records_in_window if r["shift_id"] == canonical_shift]

    # Rule 1: Daily Overtime Limit (only if approved/configured)
    if max_ot_day is not None:
        for r in records_in_window:
            ot = r["overtime_hours"] or 0
            if ot > max_ot_day:
                exceptions.append({
                    "employee_id": r["employee_id"],
                    "date": r["work_date"].isoformat(),
                    "shift": format_shift_display(r["shift_id"]),
                    "rule": "Daily Overtime Limit",
                    "detail": f"Recorded overtime of {ot}h exceeds approved threshold of {max_ot_day}h.",
                    "source": "calculated_metric",
                })

    # Rule 2: Weekly Hours Limit (only if approved/configured)
    if max_hrs_week is not None:
        emp_week_hours: dict[tuple[str, int], float] = {}
        for r in records_in_window:
            emp_id = r["employee_id"]
            cal_week = r["work_date"].isocalendar()[1]
            key = (emp_id, cal_week)
            emp_week_hours[key] = emp_week_hours.get(key, 0.0) + (r["actual_hours"] or 0)

        for (emp_id, week_num), total_hrs in emp_week_hours.items():
            if total_hrs > max_hrs_week:
                exceptions.append({
                    "employee_id": emp_id,
                    "date": f"Week {week_num}",
                    "shift": format_shift_display(canonical_shift),
                    "rule": "Weekly Hours Limit",
                    "detail": f"Cumulative weekly hours of {total_hrs}h exceed approved maximum of {max_hrs_week}h.",
                    "source": "calculated_metric",
                })

    # Rule 3: Rest Turnaround Interval (always checked via _check_rest_turnaround)
    # Group by employee_id to evaluate shift transitions
    emp_records: dict[str, list[dict[str, Any]]] = {}
    for r in raw_records:
        emp_records.setdefault(r["employee_id"], []).append(r)

    for emp_id, records in emp_records.items():
        # Sort by work_date and shift order
        shift_order = {"A": 1, "B": 2, "C": 3}
        sorted_records = sorted(
            records,
            key=lambda x: (x["work_date"], shift_order.get(x["shift_id"], 9)),
        )

        for i in range(len(sorted_records) - 1):
            curr_rec = sorted_records[i]
            next_rec = sorted_records[i + 1]

            # Only check transitions where next_rec falls into [s_date, e_date]
            if not (s_date <= next_rec["work_date"] <= e_date):
                continue
            if canonical_shift and next_rec["shift_id"] != canonical_shift:
                continue

            day_diff = (next_rec["work_date"] - curr_rec["work_date"]).days
            if day_diff in (0, 1):
                compliant, rest_hrs, reason = _check_rest_turnaround(
                    curr_rec["shift_id"],
                    next_rec["shift_id"],
                )
                if not compliant:
                    exceptions.append({
                        "employee_id": emp_id,
                        "date": next_rec["work_date"].isoformat(),
                        "shift": format_shift_display(next_rec["shift_id"]),
                        "rule": "Rest Turnaround Interval",
                        "detail": (
                            f"Turnaround conflict from Shift {curr_rec['shift_id']} on {curr_rec['work_date']}: "
                            f"{reason}"
                        ),
                        "source": "calculated_metric",
                    })

    return {
        "status": "success",
        "analysis_type": "labour_compliance",
        "exceptions": exceptions,
        "total_exceptions": len(exceptions),
        "rules_applied": rules_applied,
        "rules_not_configured": rules_not_configured,
        "requires_supervisor_hr_review": True,
        "filters": {
            "plant_id": plant_id,
            "shift_id": canonical_shift,
            "start_date": s_date.isoformat(),
            "end_date": e_date.isoformat(),
        },
        "data_limitations": [
            "Statutory labor limits (overtime and weekly hours) require corporate HR policy configuration and approval.",
            "Unapproved limits are excluded from automated violation flagging to prevent false positives.",
            "Rest turnaround analysis evaluates consecutive scheduled shifts.",
        ],
        "source": "calculated_metric",
    }

