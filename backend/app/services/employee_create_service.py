"""Service for employee options retrieval and atomic employee creation."""

import datetime as dt
import logging
import re
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.department import DepartmentMaster, EmployeeDepartmentMapping
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.plant_master import PlantMaster
from app.models.section import EmployeeSectionMapping, SectionMaster
from app.models.shift_master import ShiftMaster
from app.models.vendor import VendorMaster
from app.schemas.workforce import (
    DepartmentOption,
    DesignationOption,
    EmployeeCreateOptionsResponse,
    EmployeeCreateRequest,
    EmployeeCreateResponse,
    ExperienceBandOption,
    PlantOption,
    SectionOption,
    ShiftOption,
    VendorOption,
)

logger = logging.getLogger(__name__)


def get_employee_create_options(db: Session) -> EmployeeCreateOptionsResponse:
    """Return data-driven dropdown options for the Add Employee form."""
    # 1. Plants
    plants_raw = db.execute(
        select(PlantMaster.plant_id, PlantMaster.plant_name, PlantMaster.city, PlantMaster.state).order_by(PlantMaster.plant_id)
    ).all()
    plants = [
        PlantOption(plant_id=p.plant_id, plant_name=p.plant_name, city=p.city, state=p.state)
        for p in plants_raw
    ]

    # 2. Departments with plant_id
    dept_sql = text("""
        SELECT DISTINCT e.plant_id, d.department_id, d.department_name
        FROM public.department_master d
        JOIN public.employee_master e ON d.department_id = e.department_id
        ORDER BY e.plant_id, d.department_name
    """)
    depts_raw = db.execute(dept_sql).all()
    departments = [
        DepartmentOption(department_id=d.department_id, department_name=d.department_name, plant_id=d.plant_id)
        for d in depts_raw
    ]

    # 3. Sections with department_id
    sections_raw = db.execute(
        select(SectionMaster.section_id, SectionMaster.section_name, SectionMaster.department_id).order_by(
            SectionMaster.department_id, SectionMaster.section_name
        )
    ).all()
    sections = [
        SectionOption(section_id=s.section_id, section_name=s.section_name, department_id=s.department_id)
        for s in sections_raw
    ]

    # 4. Shifts
    shifts_raw = db.execute(
        select(ShiftMaster.shift_id, ShiftMaster.shift_name, ShiftMaster.start_time, ShiftMaster.end_time).order_by(ShiftMaster.shift_id)
    ).all()
    shifts = [
        ShiftOption(shift_id=s.shift_id, shift_name=s.shift_name, start_time=str(s.start_time), end_time=str(s.end_time))
        for s in shifts_raw
    ]

    # 5. Vendors
    vendors_raw = db.execute(
        select(VendorMaster.vendor_id, VendorMaster.vendor_name).order_by(VendorMaster.vendor_name)
    ).all()
    vendors = [
        VendorOption(vendor_id=v.vendor_id, vendor_name=v.vendor_name)
        for v in vendors_raw
    ]

    # 6. Distinct designations with most common department_id and section_id
    desig_sql = text("""
        WITH ranked AS (
            SELECT
                designation,
                department_id,
                section_id,
                COUNT(*) as cnt,
                ROW_NUMBER() OVER (
                    PARTITION BY designation
                    ORDER BY COUNT(*) DESC, department_id, section_id
                ) as rn
            FROM public.employee_master
            GROUP BY designation, department_id, section_id
        )
        SELECT designation, department_id, section_id
        FROM ranked
        WHERE rn = 1
        ORDER BY designation
    """)
    desigs_raw = db.execute(desig_sql).all()
    distinct_designations = [
        DesignationOption(designation=row.designation, department_id=row.department_id, section_id=row.section_id)
        for row in desigs_raw
    ]

    # 7. Distinct experience bands with ranges
    exp_sql = text("""
        SELECT
            experience_band,
            MIN(total_experience_years) as min_exp,
            MAX(total_experience_years) as max_exp
        FROM public.employee_experience
        GROUP BY experience_band
        ORDER BY MIN(total_experience_years)
    """)
    exp_raw = db.execute(exp_sql).all()
    distinct_experience_bands = [
        ExperienceBandOption(experience_band=row.experience_band, min_exp=float(row.min_exp), max_exp=float(row.max_exp))
        for row in exp_raw
    ]

    # 8. Distinct lists for employment_types, grades, marital_statuses, cities
    emp_types_raw = db.execute(text("SELECT DISTINCT employment_type FROM public.employee_master ORDER BY employment_type")).scalars().all()
    grades_raw = db.execute(text("SELECT DISTINCT grade FROM public.employee_master ORDER BY grade")).scalars().all()
    marital_raw = db.execute(text("SELECT DISTINCT marital_status FROM public.employee_master ORDER BY marital_status")).scalars().all()
    cities_raw = db.execute(text("SELECT DISTINCT residence_city FROM public.employee_master ORDER BY residence_city")).scalars().all()

    return EmployeeCreateOptionsResponse(
        plants=plants,
        departments=departments,
        sections=sections,
        shifts=shifts,
        vendors=vendors,
        distinct_designations=distinct_designations,
        distinct_experience_bands=distinct_experience_bands,
        employment_types=list(emp_types_raw) if emp_types_raw else ["Permanent", "Vendor"],
        grades=list(grades_raw) if grades_raw else ["G1", "G2", "G3", "G4", "G5", "G6", "G7"],
        marital_statuses=list(marital_raw) if marital_raw else ["Single", "Married"],
        cities=list(cities_raw),
    )


def compute_experience_band(total_exp: float) -> str:
    """Classify total experience years into standard enterprise band."""
    if total_exp <= 1.0:
        return "<1 yr"
    elif total_exp <= 3.0:
        return "1-3 yrs"
    elif total_exp <= 6.0:
        return "3-6 yrs"
    elif total_exp <= 10.0:
        return "6-10 yrs"
    else:
        return "10+ yrs"


def create_employee(db: Session, data: EmployeeCreateRequest) -> EmployeeCreateResponse:
    """Validate, compute fields, and insert new employee atomically across 4 tables with concurrency locks."""
    # 1. Parse & validate dates
    try:
        if isinstance(data.date_of_birth, str):
            dob = dt.date.fromisoformat(data.date_of_birth.strip())
        else:
            dob = data.date_of_birth
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date_of_birth format. Expected YYYY-MM-DD.",
        )

    try:
        if isinstance(data.date_of_joining, str):
            doj = dt.date.fromisoformat(data.date_of_joining.strip())
        else:
            doj = data.date_of_joining
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date_of_joining format. Expected YYYY-MM-DD.",
        )

    today = dt.date.today()

    # Joining date cannot be in the future
    if doj > today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date of joining cannot be in the future.",
        )

    # Age calculation: 18 to 65
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18 or age > 65:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Employee age must be between 18 and 65 years (calculated age: {age}).",
        )

    # Required string fields
    first_name = (data.first_name or "").strip()
    last_name = (data.last_name or "").strip()
    if not first_name or not last_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="First name and last name are required.",
        )

    gender = (data.gender or "").strip().title()
    if gender not in ("Male", "Female"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gender must be either 'Male' or 'Female'.",
        )

    marital_status = (data.marital_status or "").strip()
    if not marital_status:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Marital status is required.",
        )

    residence_city = (data.residence_city or "").strip()
    if not residence_city:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Residence city is required.",
        )

    employment_type = (data.employment_type or "").strip()
    if not employment_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Employment type is required.",
        )

    designation = (data.designation or "").strip()
    if not designation:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Designation is required.",
        )

    grade = (data.grade or "").strip()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Grade is required.",
        )

    if data.previous_experience_years < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Previous experience years must be >= 0.",
        )

    # 2. Foreign Key & Entity Validations
    plant = db.execute(select(PlantMaster).where(PlantMaster.plant_id == data.plant_id.strip())).scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plant '{data.plant_id}' does not exist.",
        )

    department = db.execute(select(DepartmentMaster).where(DepartmentMaster.department_id == data.department_id.strip())).scalar_one_or_none()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Department '{data.department_id}' does not exist.",
        )

    section = db.execute(select(SectionMaster).where(SectionMaster.section_id == data.section_id.strip())).scalar_one_or_none()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Section '{data.section_id}' does not exist.",
        )

    if section.department_id != department.department_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Section '{data.section_id}' ({section.section_name}) does not belong to department '{data.department_id}' ({department.department_name}).",
        )

    shift = db.execute(select(ShiftMaster).where(ShiftMaster.shift_id == data.shift_id.strip())).scalar_one_or_none()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Shift '{data.shift_id}' does not exist.",
        )

    is_vendor = employment_type.lower() == "vendor" or "contract" in employment_type.lower()
    vendor_id_clean = (data.vendor_id or "").strip() if data.vendor_id else None

    if is_vendor:
        if not vendor_id_clean:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vendor is required when employment_type is Vendor/Contract.",
            )
        vendor = db.execute(select(VendorMaster).where(VendorMaster.vendor_id == vendor_id_clean)).scalar_one_or_none()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Vendor '{vendor_id_clean}' does not exist.",
            )
    else:
        if vendor_id_clean:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vendor must be empty for permanent employees.",
            )

    # 3. Duplicate check: same full_name + date_of_birth
    full_name = f"{first_name} {last_name}"
    existing_emp = db.execute(
        select(EmployeeMaster).where(
            func.lower(EmployeeMaster.full_name) == full_name.lower(),
            EmployeeMaster.date_of_birth == dob,
        )
    ).scalar_one_or_none()

    if existing_emp:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An employee with the name '{full_name}' and date of birth '{dob}' already exists (ID: {existing_emp.employee_id}).",
        )

    # 4. Computed fields
    one_year_ago = today - dt.timedelta(days=365)
    employee_class = "New Joiner" if doj >= one_year_ago else "Experienced"

    # Company tenure and total experience
    exp_in_co = round(max(0.0, (today - doj).days / 365.25), 1)
    prev_exp = round(float(data.previous_experience_years), 1)
    tot_exp = round(prev_exp + exp_in_co, 1)
    band = compute_experience_band(tot_exp)

    # 5. Database atomic transaction with retry for concurrency safety
    next_emp_id = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Concurrency-safe ID generation: lock latest row with FOR UPDATE
            max_emp_row = db.execute(
                text(
                    "SELECT employee_id FROM public.employee_master "
                    "ORDER BY CAST(SUBSTRING(employee_id FROM '[0-9]+') AS INTEGER) DESC "
                    "LIMIT 1 FOR UPDATE"
                )
            ).scalar()
            if max_emp_row:
                m = re.search(r"\d+", str(max_emp_row))
                max_emp_num = int(m.group()) if m else 10000
            else:
                max_emp_num = 10000
            next_emp_id = f"EMP-{max_emp_num + 1}"

            max_exp_row = db.execute(
                text(
                    "SELECT experience_id FROM public.employee_experience "
                    "ORDER BY CAST(SUBSTRING(experience_id FROM '[0-9]+') AS INTEGER) DESC "
                    "LIMIT 1 FOR UPDATE"
                )
            ).scalar()
            if max_exp_row:
                m = re.search(r"\d+", str(max_exp_row))
                max_exp_num = int(m.group()) if m else 0
            else:
                max_exp_num = 0
            next_exp_id = f"EXP-{max_exp_num + 1:05d}"

            max_edm_row = db.execute(
                text(
                    "SELECT mapping_id FROM public.employee_department_mapping "
                    "ORDER BY CAST(SUBSTRING(mapping_id FROM '[0-9]+') AS INTEGER) DESC "
                    "LIMIT 1 FOR UPDATE"
                )
            ).scalar()
            if max_edm_row:
                m = re.search(r"\d+", str(max_edm_row))
                max_edm_num = int(m.group()) if m else 0
            else:
                max_edm_num = 0
            next_edm_id = f"EDM-{max_edm_num + 1:05d}"

            max_esm_row = db.execute(
                text(
                    "SELECT mapping_id FROM public.employee_section_mapping "
                    "ORDER BY CAST(SUBSTRING(mapping_id FROM '[0-9]+') AS INTEGER) DESC "
                    "LIMIT 1 FOR UPDATE"
                )
            ).scalar()
            if max_esm_row:
                m = re.search(r"\d+", str(max_esm_row))
                max_esm_num = int(m.group()) if m else 0
            else:
                max_esm_num = 0
            next_esm_id = f"ESM-{max_esm_num + 1:05d}"

            # Table 1: employee_master
            emp_record = EmployeeMaster(
                employee_id=next_emp_id,
                full_name=full_name,
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                date_of_birth=dob,
                age=age,
                marital_status=marital_status,
                plant_id=plant.plant_id,
                residence_city=residence_city,
                employment_type=employment_type,
                vendor_id=vendor_id_clean if is_vendor else None,
                department_id=department.department_id,
                section_id=section.section_id,
                designation=designation,
                grade=grade,
                shift_id=shift.shift_id,
                date_of_joining=doj,
                employment_status="Active",
                exit_date=None,
            )
            db.add(emp_record)
            db.flush()

            # Table 2: employee_experience
            exp_record = EmployeeExperience(
                experience_id=next_exp_id,
                employee_id=next_emp_id,
                date_of_joining=doj,
                highest_education=None,
                previous_industry=None,
                previous_company_type=None,
                previous_experience_years=prev_exp,
                experience_in_company_years=exp_in_co,
                total_experience_years=tot_exp,
                experience_band=band,
                probation_completed="Yes" if exp_in_co >= 0.5 else "No",
            )
            db.add(exp_record)

            # Table 3: employee_department_mapping
            edm_record = EmployeeDepartmentMapping(
                mapping_id=next_edm_id,
                employee_id=next_emp_id,
                plant_id=plant.plant_id,
                department_id=department.department_id,
                reporting_manager_id=None,
                effective_from=doj,
                effective_to=None,
                is_primary=True,
            )
            db.add(edm_record)

            # Table 4: employee_section_mapping
            esm_record = EmployeeSectionMapping(
                mapping_id=next_esm_id,
                employee_id=next_emp_id,
                department_id=department.department_id,
                section_id=section.section_id,
                role_in_section=designation,
                effective_from=doj,
                effective_to=None,
                is_primary=True,
            )
            db.add(esm_record)

            db.commit()
            try:
                from app.agents.prompts.period_helper import clear_period_cache
                clear_period_cache()
            except Exception:
                pass
            break
        except IntegrityError as exc:
            db.rollback()
            logger.warning("IntegrityError on employee create attempt %d: %s", attempt + 1, exc)
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A unique constraint conflict occurred while generating employee records. Please retry.",
                )
        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            logger.error("Failed to insert new employee in atomic transaction: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database transaction failed while creating employee: {str(exc)}",
            )

    return EmployeeCreateResponse(
        employee_id=next_emp_id,
        full_name=full_name,
        employee_class=employee_class,
        department_name=department.department_name,
        section_name=section.section_name,
        shift=f"{shift.shift_name} ({shift.shift_id})",
        plant=f"{plant.plant_name} ({plant.plant_id})",
        experience_band=band,
    )
