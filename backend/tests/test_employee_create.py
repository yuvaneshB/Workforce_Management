"""Tests for Workforce Add Employee API endpoints and validation rules."""

import datetime as dt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, text

from app.core.database import get_db, get_readonly_db
from app.main import app
from app.models.department import EmployeeDepartmentMapping
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.section import EmployeeSectionMapping

client = TestClient(app)


def test_employee_create_options_returns_non_empty_lists():
    """Verify GET /api/v1/workforce/employees/options returns data-driven dropdown lists."""
    response = client.get("/api/v1/workforce/employees/options")
    assert response.status_code == 200, f"Failed with {response.text}"
    data = response.json()

    assert "plants" in data and len(data["plants"]) > 0
    assert "departments" in data and len(data["departments"]) > 0
    assert "sections" in data and len(data["sections"]) > 0
    assert "shifts" in data and len(data["shifts"]) > 0
    assert "vendors" in data and len(data["vendors"]) > 0
    assert "distinct_designations" in data and len(data["distinct_designations"]) > 0
    assert "distinct_experience_bands" in data and len(data["distinct_experience_bands"]) > 0

    # Verify alias also works
    alias_response = client.get("/api/v1/employees/create/options")
    assert alias_response.status_code == 200


def test_successful_insert_and_cleanup():
    """Verify a valid create request inserts into employee_master, experience, and mappings with cleanup."""
    db = next(get_db())
    test_emp_id = None
    try:
        initial_count = db.execute(select(func.count(EmployeeMaster.employee_id))).scalar_one()

        payload = {
            "first_name": "Kavitha",
            "last_name": "Subramanian",
            "gender": "Female",
            "date_of_birth": "1996-05-15",
            "marital_status": "Married",
            "residence_city": "Chennai",
            "employment_type": "Permanent",
            "plant_id": "IN-TN-01",
            "department_id": "D01",
            "section_id": "S001",
            "designation": "Solder Paste Specialist",
            "grade": "G2",
            "shift_id": "A",
            "date_of_joining": "2026-09-01",
            "vendor_id": None,
            "previous_experience_years": 4.5,
        }

        # Clean up any potential stale test records first
        db.execute(
            delete(EmployeeMaster).where(
                EmployeeMaster.full_name == "Kavitha Subramanian",
                EmployeeMaster.date_of_birth == dt.date(1996, 5, 15),
            )
        )
        db.commit()

        response = client.post("/api/v1/workforce/employees", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        res_data = response.json()

        test_emp_id = res_data["employee_id"]
        assert test_emp_id.startswith("EMP-")
        assert res_data["full_name"] == "Kavitha Subramanian"
        assert res_data["employee_class"] == "New Joiner"
        assert res_data["department_name"] == "SMT Production"
        assert res_data["section_name"] == "Solder Paste Printing"
        assert "A" in res_data["shift"]
        assert "IN-TN-01" in res_data["plant"]

        # Verify count increased by 1
        new_count = db.execute(select(func.count(EmployeeMaster.employee_id))).scalar_one()
        assert new_count == initial_count + 1

        # Verify all 4 tables have rows for this employee
        emp = db.execute(select(EmployeeMaster).where(EmployeeMaster.employee_id == test_emp_id)).scalar_one_or_none()
        assert emp is not None
        assert emp.full_name == "Kavitha Subramanian"
        assert emp.employment_status == "Active"

        exp = db.execute(select(EmployeeExperience).where(EmployeeExperience.employee_id == test_emp_id)).scalar_one_or_none()
        assert exp is not None
        assert exp.previous_experience_years == 4.5

        edm = db.execute(select(EmployeeDepartmentMapping).where(EmployeeDepartmentMapping.employee_id == test_emp_id)).scalar_one_or_none()
        assert edm is not None
        assert edm.department_id == "D01"
        assert edm.is_primary is True

        esm = db.execute(select(EmployeeSectionMapping).where(EmployeeSectionMapping.employee_id == test_emp_id)).scalar_one_or_none()
        assert esm is not None
        assert esm.section_id == "S001"
        assert esm.is_primary is True

    finally:
        # Clean up test rows
        if test_emp_id:
            db.execute(delete(EmployeeSectionMapping).where(EmployeeSectionMapping.employee_id == test_emp_id))
            db.execute(delete(EmployeeDepartmentMapping).where(EmployeeDepartmentMapping.employee_id == test_emp_id))
            db.execute(delete(EmployeeExperience).where(EmployeeExperience.employee_id == test_emp_id))
            db.execute(delete(EmployeeMaster).where(EmployeeMaster.employee_id == test_emp_id))
            db.commit()
        db.close()


def test_under_18_rejected():
    """Verify applicant younger than 18 is rejected with 422 Unprocessable Entity."""
    # Person born 15 years ago
    birth_year = dt.date.today().year - 15
    payload = {
        "first_name": "Too",
        "last_name": "Young",
        "gender": "Male",
        "date_of_birth": f"{birth_year}-01-01",
        "marital_status": "Single",
        "residence_city": "Chennai",
        "employment_type": "Permanent",
        "plant_id": "IN-TN-01",
        "department_id": "D01",
        "section_id": "S001",
        "designation": "Operator",
        "grade": "G1",
        "shift_id": "A",
        "date_of_joining": "2026-01-01",
        "previous_experience_years": 0.0,
    }
    response = client.post("/api/v1/workforce/employees", json=payload)
    assert response.status_code == 422, f"Expected 422 but got {response.status_code}: {response.text}"
    assert "18" in response.text


def test_vendor_required_for_vendor_type():
    """Verify vendor employment type without vendor_id is rejected with 422 Unprocessable Entity."""
    payload = {
        "first_name": "Vendor",
        "last_name": "Applicant",
        "gender": "Male",
        "date_of_birth": "1995-01-01",
        "marital_status": "Single",
        "residence_city": "Chennai",
        "employment_type": "Vendor",
        "plant_id": "IN-TN-01",
        "department_id": "D01",
        "section_id": "S001",
        "designation": "Operator",
        "grade": "G1",
        "shift_id": "A",
        "date_of_joining": "2026-01-01",
        "vendor_id": None,
        "previous_experience_years": 1.0,
    }
    response = client.post("/api/v1/workforce/employees", json=payload)
    assert response.status_code == 422, f"Expected 422 but got {response.status_code}: {response.text}"
    assert "vendor is required" in response.text.lower()


def test_vendor_rejected_for_permanent():
    """Verify permanent employment with vendor_id populated is rejected with 422 Unprocessable Entity."""
    payload = {
        "first_name": "Permanent",
        "last_name": "Applicant",
        "gender": "Male",
        "date_of_birth": "1995-01-01",
        "marital_status": "Single",
        "residence_city": "Chennai",
        "employment_type": "Permanent",
        "plant_id": "IN-TN-01",
        "department_id": "D01",
        "section_id": "S001",
        "designation": "Operator",
        "grade": "G1",
        "shift_id": "A",
        "date_of_joining": "2026-01-01",
        "vendor_id": "V01",
        "previous_experience_years": 1.0,
    }
    response = client.post("/api/v1/workforce/employees", json=payload)
    assert response.status_code == 422, f"Expected 422 but got {response.status_code}: {response.text}"
    assert "vendor must be empty" in response.text.lower()


def test_invalid_plant_department_section_combination_rejected():
    """Verify section not belonging to department is rejected with 422 Unprocessable Entity."""
    payload = {
        "first_name": "Invalid",
        "last_name": "Pair",
        "gender": "Male",
        "date_of_birth": "1995-01-01",
        "marital_status": "Single",
        "residence_city": "Chennai",
        "employment_type": "Permanent",
        "plant_id": "IN-TN-01",
        "department_id": "D01",  # SMT Production
        "section_id": "S005",    # S005 belongs to D02 (Final Assembly), NOT D01
        "designation": "Operator",
        "grade": "G1",
        "shift_id": "A",
        "date_of_joining": "2026-01-01",
        "previous_experience_years": 1.0,
    }
    response = client.post("/api/v1/workforce/employees", json=payload)
    assert response.status_code == 422, f"Expected 422 but got {response.status_code}: {response.text}"
    assert "does not belong to department" in response.text.lower()


def test_duplicate_safe_id_generation():
    """Verify two quick inserts generate distinct sequential IDs without collision."""
    db = next(get_db())
    emp1_id = None
    emp2_id = None
    try:
        payload1 = {
            "first_name": "QuickOne",
            "last_name": "TestAlpha",
            "gender": "Male",
            "date_of_birth": "1992-03-10",
            "marital_status": "Single",
            "residence_city": "Coimbatore",
            "employment_type": "Permanent",
            "plant_id": "IN-TN-01",
            "department_id": "D01",
            "section_id": "S001",
            "designation": "Operator",
            "grade": "G1",
            "shift_id": "A",
            "date_of_joining": "2026-01-15",
            "previous_experience_years": 1.0,
        }
        payload2 = {
            "first_name": "QuickTwo",
            "last_name": "TestBeta",
            "gender": "Female",
            "date_of_birth": "1993-07-22",
            "marital_status": "Married",
            "residence_city": "Bengaluru",
            "employment_type": "Permanent",
            "plant_id": "IN-KA-01",
            "department_id": "D02",
            "section_id": "S005",
            "designation": "Assembly Operator",
            "grade": "G1",
            "shift_id": "B",
            "date_of_joining": "2026-02-01",
            "previous_experience_years": 2.0,
        }

        # Clean up any remnants
        db.execute(delete(EmployeeMaster).where(EmployeeMaster.full_name.in_(["QuickOne TestAlpha", "QuickTwo TestBeta"])))
        db.commit()

        r1 = client.post("/api/v1/workforce/employees", json=payload1)
        r2 = client.post("/api/v1/workforce/employees", json=payload2)

        assert r1.status_code == 201, f"Insert 1 failed: {r1.text}"
        assert r2.status_code == 201, f"Insert 2 failed: {r2.text}"

        emp1_id = r1.json()["employee_id"]
        emp2_id = r2.json()["employee_id"]

        assert emp1_id != emp2_id, f"Both received identical ID: {emp1_id}"

        # Extract numeric portions
        num1 = int(emp1_id.replace("EMP-", ""))
        num2 = int(emp2_id.replace("EMP-", ""))
        assert num2 == num1 + 1, f"Expected sequential IDs: {emp1_id} then {emp2_id}"

    finally:
        for eid in (emp1_id, emp2_id):
            if eid:
                db.execute(delete(EmployeeSectionMapping).where(EmployeeSectionMapping.employee_id == eid))
                db.execute(delete(EmployeeDepartmentMapping).where(EmployeeDepartmentMapping.employee_id == eid))
                db.execute(delete(EmployeeExperience).where(EmployeeExperience.employee_id == eid))
                db.execute(delete(EmployeeMaster).where(EmployeeMaster.employee_id == eid))
                db.commit()
        db.close()


def test_duplicate_employee_returns_409():
    """Verify duplicate submission (same full_name + date_of_birth) returns 409 Conflict."""
    db = next(get_db())
    test_emp_id = None
    try:
        payload = {
            "first_name": "Arun",
            "last_name": "Venkatesh",
            "gender": "Male",
            "date_of_birth": "1994-08-20",
            "marital_status": "Single",
            "residence_city": "Bengaluru",
            "employment_type": "Permanent",
            "plant_id": "IN-KA-01",
            "department_id": "D02",
            "section_id": "S005",
            "designation": "Assembly Operator",
            "grade": "G1",
            "shift_id": "B",
            "date_of_joining": "2026-01-10",
            "vendor_id": None,
            "previous_experience_years": 2.0,
        }

        # Ensure clean state
        db.execute(
            delete(EmployeeMaster).where(
                EmployeeMaster.full_name == "Arun Venkatesh",
                EmployeeMaster.date_of_birth == dt.date(1994, 8, 20),
            )
        )
        db.commit()

        # First insert succeeds
        r1 = client.post("/api/v1/workforce/employees", json=payload)
        assert r1.status_code == 201
        test_emp_id = r1.json()["employee_id"]

        # Second insert with same name and DOB must fail with 409
        r2 = client.post("/api/v1/workforce/employees", json=payload)
        assert r2.status_code == 409, f"Expected 409 but got {r2.status_code}: {r2.text}"
        assert "already exists" in r2.json()["detail"].lower()

    finally:
        if test_emp_id:
            db.execute(delete(EmployeeSectionMapping).where(EmployeeSectionMapping.employee_id == test_emp_id))
            db.execute(delete(EmployeeDepartmentMapping).where(EmployeeDepartmentMapping.employee_id == test_emp_id))
            db.execute(delete(EmployeeExperience).where(EmployeeExperience.employee_id == test_emp_id))
            db.execute(delete(EmployeeMaster).where(EmployeeMaster.employee_id == test_emp_id))
            db.commit()
        db.close()
