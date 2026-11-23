"""Focused tests for department and section filtering by active employees, plant, and department."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_list_departments_only_active_employees(client):
    response = client.get("/api/v1/departments?limit=100")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_available"] is True
    items = data["items"]
    assert len(items) > 0
    # Every department must have at least one active employee
    for dept in items:
        assert dept["employee_count"] > 0
        assert dept["department_id"]
        assert dept["department_name"]


def test_list_departments_filtered_by_plant(client):
    response_ka = client.get("/api/v1/departments?plant_id=IN-KA-01&limit=100")
    assert response_ka.status_code == 200
    data_ka = response_ka.json()
    assert data_ka["dataset_available"] is True
    assert len(data_ka["items"]) > 0
    for dept in data_ka["items"]:
        assert dept["employee_count"] > 0

    # Non-existent plant should return 0 departments
    response_invalid = client.get("/api/v1/departments?plant_id=NON_EXISTENT")
    assert response_invalid.status_code == 200
    assert response_invalid.json()["items"] == []


def test_list_sections_only_active_employees(client):
    response = client.get("/api/v1/sections?limit=100")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_available"] is True
    items = data["items"]
    assert len(items) > 0
    for sec in items:
        assert sec["employee_count"] > 0
        assert sec["section_id"]
        assert sec["section_name"]
        assert sec["department_id"] is not None


def test_list_sections_filtered_by_department(client):
    # D01 is SMT Production, which has exactly 4 sections
    response = client.get("/api/v1/sections?department_id=D01&limit=100")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) == 4
    for sec in items:
        assert sec["department_id"] == "D01"
        assert sec["employee_count"] > 0
    section_ids = [s["section_id"] for s in items]
    assert set(section_ids) == {"S001", "S002", "S003", "S004"}


def test_list_sections_filtered_by_department_and_plant(client):
    response = client.get("/api/v1/sections?department_id=D01&plant_id=IN-KA-01&limit=100")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) == 4
    for sec in items:
        assert sec["department_id"] == "D01"
        assert sec["employee_count"] > 0


def test_list_sections_invalid_department_returns_empty(client):
    response = client.get("/api/v1/sections?department_id=NON_EXISTENT")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []

