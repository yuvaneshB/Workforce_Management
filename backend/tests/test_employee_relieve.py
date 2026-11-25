"""Tests for Workforce Relieve Employee (Attrition) endpoints and validation rules."""

import datetime as dt
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import get_db, get_readonly_db
from app.main import app
from app.models.attrition import AttritionTransaction
from app.models.employee_master import EmployeeMaster
from app.services.employee_relieve_service import relieve_employee
from app.schemas.workforce import EmployeeRelieveRequest

client = TestClient(app)


def test_exit_options_returns_valid_data():
    """Verify GET /api/v1/workforce/employees/exit-options returns real DB values."""
    response = client.get("/api/v1/workforce/employees/exit-options")
    assert response.status_code == 200, f"Failed with {response.text}"
    data = response.json()

    assert "exit_types" in data and len(data["exit_types"]) > 0
    assert "exit_reasons" in data and len(data["exit_reasons"]) > 0
    assert "regrettable_loss_options" in data
    assert "Resignation" in data["exit_types"]


def test_search_active_employees():
    """Verify GET /api/v1/workforce/employees/search finds active employees."""
    response = client.get("/api/v1/workforce/employees/search?q=EMP-10001&status=Active")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["employee_id"] == "EMP-10001"
    assert items[0]["employment_status"].lower() == "active"


def test_successful_relieve_and_reinstate_cleanup():
    """Verify successful relieve records exit in DB and reinstate cleans it up."""
    # Find an active employee
    db = next(get_readonly_db())
    active_emp = db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employment_status == "Active").limit(1)
    ).scalar_one()
    emp_id = active_emp.employee_id
    original_doj = active_emp.date_of_joining
    db.close()

    exit_date_str = dt.date.today().isoformat()
    relieve_payload = {
        "exit_date": exit_date_str,
        "exit_type": "Resignation",
        "exit_reason": "Better Salary Offer",
        "regrettable_loss": "No",
        "remarks": "Test relieve cleanup",
    }

    try:
        # Relieve employee
        res = client.post(f"/api/v1/workforce/employees/{emp_id}/relieve", json=relieve_payload)
        assert res.status_code == 200, f"Relieve failed: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data["employment_status"] == "Resigned"
        assert data["attrition_id"].startswith("ATR-")

        # Verify DB state
        verify_db = next(get_readonly_db())
        updated_emp = verify_db.execute(
            select(EmployeeMaster).where(EmployeeMaster.employee_id == emp_id)
        ).scalar_one()
        assert updated_emp.employment_status == "Resigned"
        assert str(updated_emp.exit_date) == exit_date_str

        atr_row = verify_db.execute(
            select(AttritionTransaction).where(AttritionTransaction.employee_id == emp_id)
        ).scalar_one()
        assert atr_row.exit_type == "Resignation"
        assert atr_row.exit_reason == "Better Salary Offer"
        verify_db.close()

    finally:
        # Revert back to Active via reinstate endpoint
        reinstate_res = client.post(f"/api/v1/workforce/employees/{emp_id}/reinstate")
        assert reinstate_res.status_code == 200

        # Verify restored state
        cleanup_db = next(get_readonly_db())
        restored_emp = cleanup_db.execute(
            select(EmployeeMaster).where(EmployeeMaster.employee_id == emp_id)
        ).scalar_one()
        assert restored_emp.employment_status == "Active"
        assert restored_emp.exit_date is None
        cleanup_db.close()


def test_exit_date_before_joining_date_rejected():
    """Verify exit date prior to date_of_joining returns 422."""
    db = next(get_readonly_db())
    active_emp = db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employment_status == "Active").limit(1)
    ).scalar_one()
    emp_id = active_emp.employee_id
    doj = active_emp.date_of_joining
    db.close()

    invalid_exit_date = (doj - dt.timedelta(days=10)).isoformat()
    payload = {
        "exit_date": invalid_exit_date,
        "exit_type": "Resignation",
        "exit_reason": "Better Salary Offer",
        "regrettable_loss": "No",
    }
    res = client.post(f"/api/v1/workforce/employees/{emp_id}/relieve", json=payload)
    assert res.status_code == 422
    assert "before date of joining" in res.text


def test_future_exit_date_rejected():
    """Verify future exit date returns 422 validation error."""
    db = next(get_readonly_db())
    active_emp = db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employment_status == "Active").limit(1)
    ).scalar_one()
    emp_id = active_emp.employee_id
    db.close()

    future_date = (dt.date.today() + dt.timedelta(days=5)).isoformat()
    payload = {
        "exit_date": future_date,
        "exit_type": "Resignation",
        "exit_reason": "Better Salary Offer",
        "regrettable_loss": "No",
    }
    res = client.post(f"/api/v1/workforce/employees/{emp_id}/relieve", json=payload)
    assert res.status_code == 422
    assert "cannot be in the future" in res.text


def test_relieving_already_exited_employee_returns_409():
    """Verify relieving an employee who already has Resigned status returns 409 Conflict."""
    db = next(get_readonly_db())
    exited_emp = db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employment_status == "Resigned").limit(1)
    ).scalar_one()
    emp_id = exited_emp.employee_id
    db.close()

    payload = {
        "exit_date": dt.date.today().isoformat(),
        "exit_type": "Resignation",
        "exit_reason": "Better Salary Offer",
        "regrettable_loss": "No",
    }
    res = client.post(f"/api/v1/workforce/employees/{emp_id}/relieve", json=payload)
    assert res.status_code == 409
    assert "already been relieved" in res.text or "cannot be relieved" in res.text


def test_unknown_employee_returns_404():
    """Verify relieving non-existent employee returns 404."""
    payload = {
        "exit_date": dt.date.today().isoformat(),
        "exit_type": "Resignation",
        "exit_reason": "Better Salary Offer",
        "regrettable_loss": "No",
    }
    res = client.post("/api/v1/workforce/employees/EMP-999999/relieve", json=payload)
    assert res.status_code == 404
    assert "not found" in res.text.lower()


def test_rollback_on_exit_insert_failure():
    """Verify employee_master remains Active when AttritionTransaction insert fails."""
    write_db = next(get_db())
    active_emp = write_db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employment_status == "Active").limit(1)
    ).scalar_one()
    emp_id = active_emp.employee_id

    req_data = EmployeeRelieveRequest(
        exit_date=dt.date.today(),
        exit_type="Resignation",
        exit_reason="Better Salary Offer",
        regrettable_loss="No",
    )

    # Simulate failure on db.add for AttritionTransaction
    with patch.object(write_db, "commit", side_effect=RuntimeError("Simulated DB Crash")):
        with pytest.raises(Exception):
            relieve_employee(write_db, employee_id=emp_id, data=req_data)

    write_db.close()

    # Verify employee remained Active and exit_date is None
    check_db = next(get_readonly_db())
    emp_after = check_db.execute(
        select(EmployeeMaster).where(EmployeeMaster.employee_id == emp_id)
    ).scalar_one()
    assert emp_after.employment_status == "Active"
    assert emp_after.exit_date is None
    check_db.close()

