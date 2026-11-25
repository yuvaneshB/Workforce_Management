"""Service for employee relieve (attrition) management and options."""

import datetime as dt
import logging
import re
from fastapi import HTTPException, status
from sqlalchemy import asc, desc, distinct, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.attrition import AttritionTransaction
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.section import SectionMaster
from app.models.vendor import VendorMaster
from app.schemas.workforce import (
    EmployeeExitOptionsResponse,
    EmployeeReinstateResponse,
    EmployeeRelieveRequest,
    EmployeeRelieveResponse,
    EmployeeSearchResult,
    RelievedEmployeeItem,
)

logger = logging.getLogger(__name__)


def search_active_employees(
    db: Session,
    q: str = "",
    status_filter: str = "Active",
    limit: int = 10,
) -> list[EmployeeSearchResult]:
    """Search employees by ID or name (case-insensitive partial match)."""
    stmt = (
        select(
            EmployeeMaster,
            DepartmentMaster.department_name,
            SectionMaster.section_name,
            VendorMaster.vendor_name,
        )
        .outerjoin(
            DepartmentMaster,
            EmployeeMaster.department_id == DepartmentMaster.department_id,
        )
        .outerjoin(
            SectionMaster,
            EmployeeMaster.section_id == SectionMaster.section_id,
        )
        .outerjoin(
            VendorMaster,
            EmployeeMaster.vendor_id == VendorMaster.vendor_id,
        )
    )

    filters = []
    if status_filter and status_filter.strip():
        filters.append(EmployeeMaster.employment_status.ilike(status_filter.strip()))

    q_clean = (q or "").strip()
    if q_clean:
        pattern = f"%{q_clean}%"
        filters.append(
            or_(
                EmployeeMaster.employee_id.ilike(pattern),
                EmployeeMaster.full_name.ilike(pattern),
                EmployeeMaster.first_name.ilike(pattern),
                EmployeeMaster.last_name.ilike(pattern),
            )
        )

    if filters:
        stmt = stmt.where(*filters)

    stmt = stmt.order_by(asc(EmployeeMaster.employee_id)).limit(max(1, min(limit, 50)))
    results = db.execute(stmt).all()

    today = dt.date.today()
    out = []
    for emp, dept_name, sec_name, v_name in results:
        days = (today - emp.date_of_joining).days if emp.date_of_joining else 0
        tenure_m = round(max(0.0, days / 30.4375), 1)
        out.append(
            EmployeeSearchResult(
                id=emp.employee_id,
                name=emp.full_name,
                employee_id=emp.employee_id,
                full_name=emp.full_name,
                plant_id=emp.plant_id,
                department_id=emp.department_id,
                department_name=dept_name or emp.department_id,
                section_id=emp.section_id,
                section_name=sec_name or emp.section_id,
                designation=emp.designation,
                employment_type=emp.employment_type,
                vendor_id=emp.vendor_id,
                vendor_name=v_name if emp.vendor_id else None,
                shift_id=emp.shift_id,
                date_of_joining=emp.date_of_joining,
                current_tenure_months=tenure_m,
                employment_status=emp.employment_status,
            )
        )
    return out


def get_exit_options(db: Session) -> EmployeeExitOptionsResponse:
    """Retrieve distinct exit types and exit reasons already used in Neon PostgreSQL."""
    exit_types_raw = db.execute(
        select(AttritionTransaction.exit_type).distinct().order_by(AttritionTransaction.exit_type)
    ).scalars().all()

    exit_reasons_raw = db.execute(
        select(AttritionTransaction.exit_reason).distinct().order_by(AttritionTransaction.exit_reason)
    ).scalars().all()

    exit_types = [t for t in exit_types_raw if t and t.strip()]
    if not exit_types:
        exit_types = ["Resignation", "Termination", "Absconding", "Contract End"]

    exit_reasons = [r for r in exit_reasons_raw if r and r.strip()]
    if not exit_reasons:
        exit_reasons = [
            "Better Salary Offer",
            "Better Career Opportunity",
            "Family / Personal Reasons",
            "Health Issues",
            "Relocation",
            "Work Pressure",
            "Shift Timing Issues",
            "Higher Studies",
            "Contract Completed",
            "Disciplinary Action",
            "Poor Performance",
            "Absconding (No Contact)",
        ]

    return EmployeeExitOptionsResponse(
        exit_types=exit_types,
        exit_reasons=exit_reasons,
        regrettable_loss_options=["No", "Yes"],
    )


def relieve_employee(
    db: Session,
    employee_id: str,
    data: EmployeeRelieveRequest,
) -> EmployeeRelieveResponse:
    """Mark an active employee as exited/relieved in Neon DB in an atomic transaction."""
    emp_id = (employee_id or "").strip()
    if not emp_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID is required.",
        )

    # 1. Fetch employee with row lock
    stmt = select(EmployeeMaster).where(EmployeeMaster.employee_id == emp_id).with_for_update()
    employee = db.execute(stmt).scalar_one_or_none()

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{emp_id}' was not found in the database.",
        )

    # 2. Check if already exited
    if employee.employment_status.lower() == "resigned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee '{emp_id}' ({employee.full_name}) has already been relieved/resigned on {employee.exit_date}.",
        )
    elif employee.employment_status.lower() != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee '{emp_id}' has status '{employee.employment_status}' and cannot be relieved.",
        )

    # 3. Date validation
    today = dt.date.today()
    if data.exit_date > today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Exit date cannot be in the future.",
        )
    if data.exit_date < employee.date_of_joining:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Exit date ({data.exit_date}) cannot be before date of joining ({employee.date_of_joining}).",
        )

    # 4. Generate next Attrition ID
    try:
        max_atr_row = db.execute(
            text(
                "SELECT attrition_id FROM public.attrition_transactions "
                "ORDER BY CAST(SUBSTRING(attrition_id FROM '[0-9]+') AS INTEGER) DESC "
                "LIMIT 1 FOR UPDATE"
            )
        ).scalar()
        if max_atr_row:
            m = re.search(r"\d+", str(max_atr_row))
            max_num = int(m.group()) if m else 0
        else:
            max_num = 0
        next_atr_id = f"ATR-{max_num + 1:04d}"

        # Calculate tenure months
        days = (data.exit_date - employee.date_of_joining).days
        tenure_months = round(max(0.0, days / 30.4375), 1)

        # 5. Update employee_master
        employee.employment_status = "Resigned"
        employee.exit_date = data.exit_date

        # 6. Insert into attrition_transactions
        destination_text = data.remarks.strip() if data.remarks and data.remarks.strip() else "Not Applicable / Unknown"
        if len(destination_text) > 128:
            destination_text = destination_text[:128]

        atr_record = AttritionTransaction(
            attrition_id=next_atr_id,
            employee_id=employee.employee_id,
            plant_id=employee.plant_id,
            department_id=employee.department_id,
            section_id=employee.section_id,
            employment_type=employee.employment_type,
            vendor_id=employee.vendor_id,
            designation=employee.designation,
            grade=employee.grade,
            gender=employee.gender,
            date_of_joining=employee.date_of_joining,
            resignation_date=data.exit_date,
            last_working_day=data.exit_date,
            notice_period_days=0,
            tenure_months=tenure_months,
            exit_type=data.exit_type.strip(),
            exit_reason=data.exit_reason.strip(),
            regrettable_loss="Yes" if data.regrettable_loss.strip().capitalize() == "Yes" else "No",
            exit_interview_done="Yes",
            rehire_eligible="Yes" if data.exit_type.strip().lower() != "termination" else "No",
            destination=destination_text,
            last_drawn_monthly_inr=23000.0,
        )
        db.add(atr_record)

        db.commit()

        # Invalidate period cache
        try:
            from app.agents.prompts.period_helper import clear_period_cache
            clear_period_cache()
        except Exception:
            pass

    except IntegrityError as exc:
        db.rollback()
        logger.warning("IntegrityError on employee relieve: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A unique constraint conflict occurred while recording the exit transaction. Please retry.",
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Failed to relieve employee '%s': %s", emp_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while relieving employee: {str(exc)}",
        )

    return EmployeeRelieveResponse(
        success=True,
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        employment_status="Resigned",
        exit_date=data.exit_date,
        exit_type=data.exit_type.strip(),
        exit_reason=data.exit_reason.strip(),
        regrettable_loss=atr_record.regrettable_loss,
        tenure_months=tenure_months,
        attrition_id=next_atr_id,
        message=f"Employee {employee.full_name} ({employee.employee_id}) successfully relieved.",
    )


def get_recently_relieved(db: Session, limit: int = 20) -> list[RelievedEmployeeItem]:
    """Retrieve recently relieved employees for the Workforce Management Relieve tab."""
    stmt = (
        select(
            AttritionTransaction,
            EmployeeMaster.full_name,
            DepartmentMaster.department_name,
        )
        .join(
            EmployeeMaster,
            AttritionTransaction.employee_id == EmployeeMaster.employee_id,
        )
        .outerjoin(
            DepartmentMaster,
            AttritionTransaction.department_id == DepartmentMaster.department_id,
        )
        .order_by(
            desc(AttritionTransaction.last_working_day),
            desc(AttritionTransaction.attrition_id),
        )
        .limit(max(1, min(limit, 100)))
    )

    rows = db.execute(stmt).all()
    out = []
    for atr, emp_name, dept_name in rows:
        out.append(
            RelievedEmployeeItem(
                attrition_id=atr.attrition_id,
                employee_id=atr.employee_id,
                employee_name=emp_name or atr.employee_id,
                department_name=dept_name or atr.department_id,
                exit_date=atr.last_working_day,
                exit_type=atr.exit_type,
                exit_reason=atr.exit_reason,
                regrettable_loss=atr.regrettable_loss,
                tenure_months=atr.tenure_months,
            )
        )
    return out


def reinstate_employee(db: Session, employee_id: str) -> EmployeeReinstateResponse:
    """Safety endpoint to undo a mistaken relieve, marking employee Active and clearing exit record."""
    emp_id = (employee_id or "").strip()
    if not emp_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID is required.",
        )

    stmt = select(EmployeeMaster).where(EmployeeMaster.employee_id == emp_id).with_for_update()
    employee = db.execute(stmt).scalar_one_or_none()

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{emp_id}' was not found.",
        )

    if employee.employment_status.lower() == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee '{emp_id}' is already Active.",
        )

    try:
        # Reset employee_master
        employee.employment_status = "Active"
        employee.exit_date = None

        # Remove corresponding attrition transaction(s)
        atr_stmt = select(AttritionTransaction).where(AttritionTransaction.employee_id == emp_id)
        atrs = db.execute(atr_stmt).scalars().all()
        for atr in atrs:
            db.delete(atr)

        db.commit()

        try:
            from app.agents.prompts.period_helper import clear_period_cache
            clear_period_cache()
        except Exception:
            pass

    except Exception as exc:
        db.rollback()
        logger.error("Failed to reinstate employee '%s': %s", emp_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while reinstating employee: {str(exc)}",
        )

    return EmployeeReinstateResponse(
        success=True,
        employee_id=emp_id,
        message=f"Employee '{emp_id}' ({employee.full_name}) successfully reinstated to Active status.",
    )
