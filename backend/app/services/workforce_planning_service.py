"""Workforce Planning Service.

Implements business logic for:
1. Workforce Availability Analysis
2. Workforce Shortage Detection
3. Employee Replacement Recommendations & Deterministic Scoring
"""

import datetime as dt
from typing import Any

from sqlalchemy.orm import Session

from app.repositories import workforce_planning_repository as planning_repo

# Standard skill grade hierarchy
SKILL_GRADE_LEVELS = {
    "L1": 1,
    "L2": 2,
    "L3": 3,
    "L4": 4,
}

LATE_POLICY_DOCUMENTATION = (
    "Late employees are tracked separately from immediately available start-of-shift workforce. "
    "To protect line startup reliability, available_count reflects immediately present workers "
    "(attendance_status == 'PRESENT'). Late workers are reported in late_count and become available "
    "post-arrival."
)

CERTIFICATION_LIMITATION_NOTE = (
    "The enterprise database tracks certification validity via the verified training_compliance "
    "field ('CURRENT' vs 'EXPIRED') recorded on daily attendance events. Explicit calendar expiry "
    "timestamps (e.g. certification_expiry_date) are not maintained in the source schema."
)

ROLE_QUOTA_LIMITATION_NOTE = (
    "Authoritative workforce baselines are established at the 10-person team and 30-person "
    "plant-shift operational levels. While role-specific shortages are evaluated against the scheduled "
    "roster, static individual machine or role quotas are not stored in the database."
)


def calculate_workforce_availability(
    db: Session,
    *,
    target_date: dt.date,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
) -> dict[str, Any]:
    """Calculate date-specific workforce availability distinguishing PRESENT, ABSENT,

    LEAVE, and LATE statuses, applying explicit policy for late workers and avoiding double counting.
    """
    records = planning_repo.get_attendance_records_for_planning(
        db,
        target_date=target_date,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
    )

    total_scheduled = len(records)
    if total_scheduled == 0:
        return {
            "date": target_date.isoformat(),
            "plant_id": plant_id,
            "shift_id": shift_id,
            "department_id": department_id,
            "section_id": section_id,
            "total_scheduled": 0,
            "present_count": 0,
            "absent_count": 0,
            "leave_count": 0,
            "late_count": 0,
            "available_count": 0,
            "potential_total_with_late": 0,
            "availability_rate": 0.0,
            "absenteeism_rate": 0.0,
            "late_policy": LATE_POLICY_DOCUMENTATION,
            "message": f"No attendance records found for date {target_date.isoformat()}.",
            "by_role": {},
            "by_shift": {},
            "by_plant": {},
        }

    present_count = 0
    absent_count = 0
    leave_count = 0
    late_count = 0

    by_role: dict[str, dict[str, int]] = {}
    by_shift: dict[str, dict[str, int]] = {}
    by_plant: dict[str, dict[str, int]] = {}

    for r in records:
        status_raw = str(r.get("attendance_status") or "").strip()
        status = status_raw.upper()
        role = r.get("role") or "Unknown"
        shift = r.get("shift_id") or "Unknown"
        plant = r.get("plant_id") or "Unknown"

        if status == "PRESENT":
            present_count += 1
        elif status == "ABSENT":
            absent_count += 1
        elif status == "LEAVE":
            leave_count += 1
        elif status == "LATE":
            late_count += 1

        # Tally by role
        status_key = status.lower()
        if role not in by_role:
            by_role[role] = {"scheduled": 0, "present": 0, "absent": 0, "leave": 0, "late": 0}
        by_role[role]["scheduled"] += 1
        if status_key in by_role[role]:
            by_role[role][status_key] += 1

        # Tally by shift
        if shift not in by_shift:
            by_shift[shift] = {"scheduled": 0, "present": 0, "absent": 0, "leave": 0, "late": 0}
        by_shift[shift]["scheduled"] += 1
        if status_key in by_shift[shift]:
            by_shift[shift][status_key] += 1

        # Tally by plant
        if plant not in by_plant:
            by_plant[plant] = {"scheduled": 0, "present": 0, "absent": 0, "leave": 0, "late": 0}
        by_plant[plant]["scheduled"] += 1
        if status_key in by_plant[plant]:
            by_plant[plant][status_key] += 1

    # Immediately available count excludes ABSENT, LEAVE, and LATE
    available_count = present_count
    potential_total_with_late = present_count + late_count

    availability_rate = round((present_count / total_scheduled) * 100.0, 1)
    absenteeism_rate = round(((absent_count + leave_count) / total_scheduled) * 100.0, 1)

    return {
        "date": target_date.isoformat(),
        "plant_id": plant_id,
        "shift_id": shift_id,
        "department_id": department_id,
        "section_id": section_id,
        "total_scheduled": total_scheduled,
        "present_count": present_count,
        "absent_count": absent_count,
        "leave_count": leave_count,
        "late_count": late_count,
        "available_count": available_count,
        "potential_total_with_late": potential_total_with_late,
        "availability_rate": availability_rate,
        "absenteeism_rate": absenteeism_rate,
        "late_policy": LATE_POLICY_DOCUMENTATION,
        "by_role": by_role,
        "by_shift": by_shift,
        "by_plant": by_plant,
    }


def detect_workforce_shortages(
    db: Session,
    *,
    target_date: dt.date,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict[str, Any]:
    """Calculate workforce shortage against the verified 10-person-team and

    30-person-plant-shift operational baseline. Validates team roster composition and
    distinguishes total headcount shortages from role-specific roster shortages.
    """
    # 1. Team composition & operational baseline derived directly from the database roster
    team_comp = planning_repo.get_team_roster_composition(
        db,
        plant_id=plant_id,
        shift_id=shift_id,
    )
    baseline = sum(t["employee_count"] for t in team_comp)
    num_teams = len(team_comp)
    avg_per_team = round(baseline / num_teams) if num_teams > 0 else 0

    if plant_id and shift_id:
        baseline_scope = f"Plant {plant_id} Shift {shift_id} ({num_teams} teams, {baseline} workers planned)"
    elif plant_id:
        baseline_scope = f"Plant {plant_id} All Shifts ({num_teams} teams, {baseline} workers planned)"
    elif shift_id:
        baseline_scope = f"Shift {shift_id} All Plants ({num_teams} teams, {baseline} workers planned)"
    else:
        baseline_scope = f"Factory-Wide ({num_teams} teams, {baseline} workers planned)"

    # 2. Scheduled teams representation
    scheduled_teams = [
        {
            "team_id": t["team_id"],
            "plant_id": t["plant_id"],
            "home_shift": t["home_shift"],
            "headcount": t["employee_count"],
            "is_standard_size": t["employee_count"] == avg_per_team,
        }
        for t in team_comp
    ]

    # 3. Get attendance for the date
    availability = calculate_workforce_availability(
        db,
        target_date=target_date,
        plant_id=plant_id,
        shift_id=shift_id,
    )

    available_workforce = availability["available_count"]
    shortage_count = max(0, baseline - available_workforce)
    shortage_percentage = round((shortage_count / baseline) * 100.0, 1) if baseline > 0 else 0.0

    if shortage_count == 0:
        severity = "OPTIMAL"
    elif shortage_percentage < 10.0:
        severity = "LOW"
    elif shortage_percentage < 20.0:
        severity = "MODERATE"
    else:
        severity = "CRITICAL"

    # 4. Role-specific shortage analysis
    role_shortages = {}
    for role, stats in availability.get("by_role", {}).items():
        scheduled = stats["scheduled"]
        present = stats["present"]
        role_shortage = max(0, scheduled - present)
        role_shortages[role] = {
            "scheduled": scheduled,
            "present": present,
            "absent": stats["absent"],
            "leave": stats["leave"],
            "late": stats["late"],
            "shortage": role_shortage,
            "shortage_percentage": round((role_shortage / scheduled) * 100.0, 1) if scheduled > 0 else 0.0,
        }

    explanation = (
        f"For {target_date.isoformat()} ({baseline_scope}), the target operational baseline is {baseline} workers. "
        f"With {available_workforce} immediately present workers, the detected workforce shortage is {shortage_count} "
        f"workers ({shortage_percentage}% shortfall, {severity} severity). "
        f"{availability['absent_count']} absent and {availability['leave_count']} on leave."
    )
    if availability["late_count"] > 0:
        explanation += f" An additional {availability['late_count']} late worker(s) may become available post-arrival."

    # 5. Dimension-specific shortages (shift, department, section, plant) from workforce_requirement
    from app.models.requirement import WorkforceRequirement
    from app.models.department import DepartmentMaster
    from app.models.section import SectionMaster
    from app.models.shift_master import ShiftMaster
    from app.models.plant_master import PlantMaster
    from sqlalchemy import select, func, desc

    month_str = target_date.strftime("%Y-%m")

    # Shift shortages
    shift_stmt = (
        select(
            ShiftMaster.shift_id,
            ShiftMaster.shift_name,
            func.coalesce(func.sum(WorkforceRequirement.required_headcount), 0),
            func.coalesce(func.sum(WorkforceRequirement.actual_headcount), 0),
        )
        .join(WorkforceRequirement, ShiftMaster.shift_id == WorkforceRequirement.shift_id)
        .where(WorkforceRequirement.month == month_str)
        .group_by(ShiftMaster.shift_id, ShiftMaster.shift_name)
        .order_by(ShiftMaster.shift_id)
    )
    if plant_id:
        shift_stmt = shift_stmt.where(WorkforceRequirement.plant_id == plant_id)
    shift_shortages = []
    for r in db.execute(shift_stmt).all():
        s_id, s_name, req, act = str(r[0]), str(r[1]), int(r[2]), int(r[3])
        gap = max(0, req - act)
        sev = "OPTIMAL" if gap == 0 else "LOW" if gap < 20 else "MODERATE" if gap < 40 else "CRITICAL"
        shift_shortages.append({
            "name": f"Shift {s_id} – {s_name}",
            "required": req,
            "available": act,
            "shortage": gap,
            "severity": sev,
        })

    # Department shortages
    dept_stmt = (
        select(
            DepartmentMaster.department_name,
            func.coalesce(func.sum(WorkforceRequirement.required_headcount), 0),
            func.coalesce(func.sum(WorkforceRequirement.actual_headcount), 0),
        )
        .join(WorkforceRequirement, DepartmentMaster.department_id == WorkforceRequirement.department_id)
        .where(WorkforceRequirement.month == month_str)
        .group_by(DepartmentMaster.department_name)
        .order_by(desc(func.sum(WorkforceRequirement.required_headcount - WorkforceRequirement.actual_headcount)))
        .limit(6)
    )
    if plant_id:
        dept_stmt = dept_stmt.where(WorkforceRequirement.plant_id == plant_id)
    dept_shortages = []
    for r in db.execute(dept_stmt).all():
        d_name, req, act = str(r[0]), int(r[1]), int(r[2])
        gap = max(0, req - act)
        sev = "OPTIMAL" if gap == 0 else "LOW" if gap < 10 else "MODERATE" if gap < 20 else "CRITICAL"
        dept_shortages.append({
            "name": d_name,
            "required": req,
            "available": act,
            "shortage": gap,
            "severity": sev,
        })

    # Section shortages
    sec_stmt = (
        select(
            WorkforceRequirement.section_name,
            WorkforceRequirement.section_id,
            func.coalesce(func.sum(WorkforceRequirement.required_headcount), 0),
            func.coalesce(func.sum(WorkforceRequirement.actual_headcount), 0),
        )
        .where(WorkforceRequirement.month == month_str)
        .group_by(WorkforceRequirement.section_name, WorkforceRequirement.section_id)
        .order_by(desc(func.sum(WorkforceRequirement.required_headcount - WorkforceRequirement.actual_headcount)))
        .limit(6)
    )
    if plant_id:
        sec_stmt = sec_stmt.where(WorkforceRequirement.plant_id == plant_id)
    section_shortages = []
    for r in db.execute(sec_stmt).all():
        s_name, s_id, req, act = str(r[0]), str(r[1]), int(r[2]), int(r[3])
        gap = max(0, req - act)
        sev = "OPTIMAL" if gap == 0 else "LOW" if gap < 5 else "MODERATE" if gap < 10 else "CRITICAL"
        section_shortages.append({
            "name": f"{s_name} ({s_id})",
            "required": req,
            "available": act,
            "shortage": gap,
            "severity": sev,
        })

    # Plant shortages
    plant_stmt = (
        select(
            PlantMaster.plant_id,
            PlantMaster.plant_name,
            func.coalesce(func.sum(WorkforceRequirement.required_headcount), 0),
            func.coalesce(func.sum(WorkforceRequirement.actual_headcount), 0),
        )
        .join(WorkforceRequirement, PlantMaster.plant_id == WorkforceRequirement.plant_id)
        .where(WorkforceRequirement.month == month_str)
        .group_by(PlantMaster.plant_id, PlantMaster.plant_name)
        .order_by(PlantMaster.plant_id)
    )
    plant_shortages = []
    for r in db.execute(plant_stmt).all():
        p_id, p_name, req, act = str(r[0]), str(r[1]), int(r[2]), int(r[3])
        gap = max(0, req - act)
        sev = "OPTIMAL" if gap == 0 else "LOW" if gap < 20 else "MODERATE" if gap < 40 else "CRITICAL"
        plant_shortages.append({
            "name": f"Plant {p_id} – {p_name}",
            "required": req,
            "available": act,
            "shortage": gap,
            "severity": sev,
        })

    return {
        "date": target_date.isoformat(),
        "plant_id": plant_id,
        "shift_id": shift_id,
        "baseline_scope": baseline_scope,
        "required_baseline": baseline,
        "available_workforce": available_workforce,
        "shortage_count": shortage_count,
        "shortage_percentage": shortage_percentage,
        "severity": severity,
        "absent_count": availability["absent_count"],
        "leave_count": availability["leave_count"],
        "late_count": availability["late_count"],
        "calculation_explanation": explanation,
        "role_shortages": role_shortages,
        "shift_shortages": shift_shortages,
        "department_shortages": dept_shortages,
        "section_shortages": section_shortages,
        "plant_shortages": plant_shortages,
        "team_composition_validated": all(t["is_standard_size"] for t in scheduled_teams),
        "scheduled_teams": scheduled_teams,
        "limitations": {
            "late_policy": LATE_POLICY_DOCUMENTATION,
            "role_quotas": ROLE_QUOTA_LIMITATION_NOTE,
        },
    }


def _check_rest_turnaround(
    candidate_shift: str,
    target_shift: str,
) -> tuple[bool, int, str]:
    """Validate shift rest turnaround interval.

    Shift A: 06:00 - 14:00 (Morning)
    Shift B: 14:00 - 22:00 (Evening)
    Shift C: 22:00 - 06:00 (Night, crosses midnight)

    Rules:
    - Same shift: candidate already in target shift (0 turnaround).
    - Shift C -> Shift A: Shift C ends at 06:00, Shift A starts at 06:00 -> 0h rest (Fatigue violation).
    - Shift A -> Shift B: Shift A ends at 14:00, Shift B starts at 14:00 -> 0h rest (Double shift).
    - Shift B -> Shift C: Shift B ends at 22:00, Shift C starts at 22:00 -> 0h rest (Double shift).
    - Shift B -> Shift A: Shift B ends at 22:00, Shift A starts at 06:00 next day -> 8h rest (Compliant turnaround).
    - Shift C -> Shift B: Shift C ends at 06:00, Shift B starts at 14:00 -> 8h rest (Compliant turnaround).
    - Shift A -> Shift C: Shift A ends at 14:00, Shift C starts at 22:00 -> 8h rest (Compliant turnaround).
    """
    if candidate_shift == target_shift:
        return False, 0, f"Candidate is already scheduled/working in target shift {target_shift}."

    # Immediate consecutive shifts with 0 hours rest
    zero_rest_transitions = {
        ("C", "A"): "Shift C ends at 06:00, providing 0 hours of rest before Shift A starts at 06:00.",
        ("A", "B"): "Shift A ends at 14:00, providing 0 hours of rest before Shift B starts at 14:00.",
        ("B", "C"): "Shift B ends at 22:00, providing 0 hours of rest before Shift C starts at 22:00.",
    }

    transition = (candidate_shift, target_shift)
    if transition in zero_rest_transitions:
        return False, 0, f"Turnaround conflict (fatigue hazard): {zero_rest_transitions[transition]}"

    # Compliant 8-hour gap transitions
    return True, 8, f"Compliant 8-hour rest interval between Shift {candidate_shift} and Shift {target_shift}."


def recommend_replacement_candidates(
    db: Session,
    *,
    absent_employee_id: str,
    target_date: dt.date,
    target_shift: str | None = None,
    mandatory_certification: bool = True,
) -> dict[str, Any]:
    """Identify, filter, score, and rank eligible replacement candidates for an absent employee.

    Applies strict mandatory gates (plant isolation, active status, not absent/leave, shift conflict,
    rest interval, role matching, skill grade >= absent grade, training compliance == CURRENT,
    and mandatory certification matching).
    Scores and ranks eligible candidates deterministically using skill grade, certification,
    section/department affinity, experience, and overtime balance.
    """
    # 1. Retrieve absent employee profile
    absent_emp = planning_repo.get_absent_employee_details(
        db,
        employee_id=absent_employee_id,
        target_date=target_date,
    )

    if not absent_emp:
        return {
            "absent_employee": None,
            "target_date": target_date.isoformat(),
            "eligible_candidates_count": 0,
            "candidates": [],
            "message": f"Employee '{absent_employee_id}' not found.",
        }

    actual_plant = absent_emp.get("plant_id")
    # If plant is not populated in attendance record (e.g. employee had no attendance row), look up via team
    if not actual_plant:
        # Fallback to team lookup
        team_roster = planning_repo.get_team_roster_composition(db)
        for t in team_roster:
            if t["team_id"] == absent_emp.get("team_id"):
                actual_plant = t["plant_id"]
                break

    resolved_shift = target_shift or absent_emp.get("actual_shift") or absent_emp.get("home_shift") or "A"
    absent_role = absent_emp.get("role") or ""
    absent_grade = absent_emp.get("skill_grade") or "L1"
    absent_grade_level = SKILL_GRADE_LEVELS.get(absent_grade, 1)
    absent_cert = absent_emp.get("certification") or ""
    absent_dept_id = absent_emp.get("department_id")
    absent_sec_id = absent_emp.get("section_id")

    absent_summary = {
        "employee_id": absent_emp["employee_id"],
        "employee_name": absent_emp.get("employee_name") or "Unknown",
        "role": absent_role,
        "skill_grade": absent_grade,
        "certification": absent_cert,
        "plant_id": actual_plant,
        "home_shift": absent_emp.get("home_shift"),
        "target_shift": resolved_shift,
        "department_id": absent_dept_id,
        "department_name": absent_emp.get("department_name"),
        "section_id": absent_sec_id,
        "section_name": absent_emp.get("section_name"),
        "attendance_status": absent_emp.get("attendance_status") or "NOT RECORDED",
        "experience_years": absent_emp.get("experience_years", 0),
        "experience_months": absent_emp.get("experience_months", 0),
    }

    # 2. Retrieve pool of potential candidates in the same plant with matching role
    candidate_pool = planning_repo.get_replacement_candidate_pool(
        db,
        target_plant=actual_plant,
        target_date=target_date,
        exclude_employee_id=absent_employee_id,
        target_role=absent_role,
    )

    eligible_candidates = []
    disqualified_candidates = []

    for cand in candidate_pool:
        cand_id = cand["employee_id"]
        cand_name = cand["employee_name"]
        cand_grade = cand.get("skill_grade") or "L1"
        cand_grade_level = SKILL_GRADE_LEVELS.get(cand_grade, 1)
        cand_cert = cand.get("certification") or ""
        cand_shift = cand.get("target_date_shift") or cand.get("home_shift") or "A"
        cand_status = cand.get("target_date_status") or "PRESENT"
        cand_compliance = cand.get("target_date_compliance") or "CURRENT"
        cand_exp_yrs = cand.get("experience_years") or 0
        cand_exp_mos = cand.get("experience_months") or 0
        cand_total_exp_mos = (cand_exp_yrs * 12) + cand_exp_mos
        cand_ot = float(cand.get("cumulative_overtime_hours") or 0.0)
        cand_dept_id = cand.get("department_id")
        cand_sec_id = cand.get("section_id")

        disqualify_reasons = []

        # Gate 1: Candidate attendance status on target date
        if cand_status in ("ABSENT", "LEAVE"):
            disqualify_reasons.append(f"Candidate is {cand_status} on target date.")

        # Gate 2: Shift conflict / already working
        if cand_shift == resolved_shift and cand_status in ("PRESENT", "LATE"):
            disqualify_reasons.append(f"Already working in target shift {resolved_shift} on {target_date.isoformat()}.")

        # Gate 3: Rest interval turnaround
        rest_ok, rest_hours, rest_msg = _check_rest_turnaround(cand_shift, resolved_shift)
        if not rest_ok:
            disqualify_reasons.append(rest_msg)

        # Gate 4: Skill grade requirement (must be >= absent employee's grade)
        if cand_grade_level < absent_grade_level:
            disqualify_reasons.append(
                f"Skill grade {cand_grade} is below absent employee grade {absent_grade}."
            )

        # Gate 5: Training compliance
        if cand_compliance != "CURRENT":
            disqualify_reasons.append(
                f"Training compliance is {cand_compliance} (must be CURRENT)."
            )

        # Gate 6: Mandatory Certification Match
        if mandatory_certification and absent_cert:
            if cand_cert != absent_cert:
                disqualify_reasons.append(
                    f"Certification mismatch: Role requires mandatory '{absent_cert}' certification, but candidate holds '{cand_cert or 'None'}'."
                )

        if disqualify_reasons:
            disqualified_candidates.append({
                "employee_id": cand_id,
                "employee_name": cand_name,
                "skill_grade": cand_grade,
                "certification": cand_cert,
                "shift": cand_shift,
                "disqualify_reasons": disqualify_reasons,
            })
            continue

        # 3. Deterministic Scoring Algorithm (Max 100 points)
        # A. Skill Grade Match (Max 30 pts)
        if cand_grade_level == absent_grade_level:
            score_grade = 30.0  # Exact right-sized match
            grade_note = f"Exact skill grade match ({cand_grade})"
        else:
            score_grade = 25.0  # Higher grade (overqualified, capable)
            grade_note = f"Higher skill grade ({cand_grade} > {absent_grade})"

        # B. Certification Alignment (Max 20 pts)
        if cand_cert == absent_cert and cand_cert:
            if cand_compliance == "CURRENT":
                score_cert = 20.0
                cert_note = f"Exact certification match ({cand_cert}) with verified CURRENT compliance"
            else:
                score_cert = 10.0
                cert_note = f"Matching certification ({cand_cert}) but compliance status is {cand_compliance}"
        else:
            score_cert = 0.0
            if cand_cert:
                cert_note = f"Unrelated certification ({cand_cert} vs required {absent_cert}); 0 certification points awarded"
            else:
                cert_note = "No certification held; 0 certification points awarded"

        # C. Department & Section Affinity (Max 20 pts)
        score_loc = 0.0
        loc_notes = []
        if cand_sec_id and cand_sec_id == absent_sec_id:
            score_loc += 15.0
            loc_notes.append(f"Same section ({cand.get('section_name')})")
        if cand_dept_id and cand_dept_id == absent_dept_id:
            score_loc += 5.0
            loc_notes.append(f"Same department ({cand.get('department_name')})")
        if not loc_notes:
            loc_notes.append("Cross-section transfer within plant")

        # D. Experience Seniority (Max 15 pts: max 15 years = 180 months)
        score_exp = min(15.0, round((cand_total_exp_mos / 180.0) * 15.0, 1))
        exp_note = f"{cand_exp_yrs} yrs {cand_exp_mos} mos experience ({score_exp}/15 pts)"

        # E. Overtime Load Balancing (Max 15 pts: lower recent overtime gets higher priority)
        # Average OT in factory is ~56 hrs. Scale from 0 to 100 hrs.
        score_ot = max(0.0, round(15.0 - (cand_ot / 100.0) * 15.0, 1))
        ot_note = f"Cumulative overtime: {cand_ot:.0f} hrs ({score_ot}/15 pts, fatigue balance)"

        total_score = round(score_grade + score_cert + score_loc + score_exp + score_ot, 1)

        recommendation_reasons = [
            f"Matching role: {absent_role}",
            grade_note,
            cert_note,
            ", ".join(loc_notes),
            exp_note,
            ot_note,
            rest_msg,
        ]

        eligible_candidates.append({
            "employee_id": cand_id,
            "employee_name": cand_name,
            "role": absent_role,
            "skill_grade": cand_grade,
            "certification": cand_cert,
            "experience": {
                "years": cand_exp_yrs,
                "months": cand_exp_mos,
                "total_months": cand_total_exp_mos,
            },
            "plant_id": actual_plant,
            "department_id": cand_dept_id,
            "department_name": cand.get("department_name"),
            "section_id": cand_sec_id,
            "section_name": cand.get("section_name"),
            "home_shift": cand.get("home_shift"),
            "current_shift": cand_shift,
            "target_shift": resolved_shift,
            "turnaround_hours": rest_hours,
            "cumulative_overtime_hours": cand_ot,
            "training_compliance": cand_compliance,
            "eligibility_status": "ELIGIBLE",
            "score": total_score,
            "score_breakdown": {
                "skill_grade": score_grade,
                "certification": score_cert,
                "location_affinity": score_loc,
                "experience": score_exp,
                "overtime_balance": score_ot,
            },
            "recommendation_reasons": recommendation_reasons,
        })

    # Sort descending by score, tie-break by total experience months descending
    eligible_candidates.sort(
        key=lambda c: (c["score"], c["experience"]["total_months"], -c["cumulative_overtime_hours"]),
        reverse=True,
    )

    # Assign 1-indexed rank
    for rank_idx, cand in enumerate(eligible_candidates, start=1):
        cand["rank"] = rank_idx

    message = (
        f"Found {len(eligible_candidates)} eligible replacement candidate(s) for {absent_summary['employee_name']} "
        f"({absent_employee_id}, {absent_role} {absent_grade}) on {target_date.isoformat()} (Shift {resolved_shift})."
        if eligible_candidates
        else (
            f"No eligible replacement candidates found matching all criteria for {absent_summary['employee_name']} "
            f"({absent_employee_id}, {absent_role} {absent_grade}) on {target_date.isoformat()}."
        )
    )

    return {
        "target_date": target_date.isoformat(),
        "target_shift": resolved_shift,
        "mandatory_certification": mandatory_certification,
        "absent_employee": absent_summary,
        "eligible_candidates_count": len(eligible_candidates),
        "disqualified_candidates_count": len(disqualified_candidates),
        "candidates": eligible_candidates,
        "disqualified_summary": disqualified_candidates[:10],
        "message": message,
        "limitations": {
            "training_compliance": CERTIFICATION_LIMITATION_NOTE,
        },
    }

