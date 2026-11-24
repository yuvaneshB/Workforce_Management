"""Integration tests for Dashboard filtering by employment_type and vendor_id.

Verifies that all analytics, planning, and intelligence endpoints accept
employment_type and vendor_id parameters cleanly, execute without errors,
and return consistent, filtered data.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_workforce_summary_employment_type_and_vendor(client: TestClient) -> None:
    """Verify workforce summary correctly filters by employment_type and vendor_id."""
    # Baseline
    res_all = client.get("/api/v1/workforce/summary")
    assert res_all.status_code == 200
    data_all = res_all.json()
    total = data_all["total_employees"]
    perm_total = data_all["permanent_count"]
    vendor_total = data_all["vendor_count"]
    assert total == perm_total + vendor_total

    # Permanent only
    res_perm = client.get("/api/v1/workforce/summary", params={"employment_type": "permanent"})
    assert res_perm.status_code == 200
    data_perm = res_perm.json()
    assert data_perm["permanent_count"] == perm_total
    assert data_perm["vendor_count"] == 0
    assert data_perm["total_employees"] == perm_total

    # Vendor only
    res_vendor = client.get("/api/v1/workforce/summary", params={"employment_type": "vendor"})
    assert res_vendor.status_code == 200
    data_vendor = res_vendor.json()
    assert data_vendor["permanent_count"] == 0
    assert data_vendor["vendor_count"] == vendor_total
    assert data_vendor["total_employees"] == vendor_total

    # Specific vendor
    res_v01 = client.get("/api/v1/workforce/summary", params={"vendor_id": "V01"})
    assert res_v01.status_code == 200
    data_v01 = res_v01.json()
    assert data_v01["permanent_count"] == 0
    assert data_v01["vendor_count"] > 0
    assert data_v01["total_employees"] == data_v01["vendor_count"]


def test_attendance_analytics_filtered_by_employment_type(client: TestClient) -> None:
    """Verify attendance analytics filters by employment_type and vendor_id."""
    res_all = client.get(
        "/api/v1/analytics/attendance",
        params={"start_date": "2026-08-01", "end_date": "2026-08-07"},
    )
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "attendance_rate" in data_all
    assert "absenteeism_rate" in data_all

    res_perm = client.get(
        "/api/v1/analytics/attendance",
        params={
            "start_date": "2026-08-01",
            "end_date": "2026-08-07",
            "employment_type": "permanent",
        },
    )
    assert res_perm.status_code == 200
    data_perm = res_perm.json()
    assert data_perm["total_records"] < data_all["total_records"]
    assert data_perm["attendance_rate"] > 0

    res_v01 = client.get(
        "/api/v1/analytics/attendance",
        params={
            "start_date": "2026-08-01",
            "end_date": "2026-08-07",
            "vendor_id": "V01",
        },
    )
    assert res_v01.status_code == 200
    data_v01 = res_v01.json()
    assert data_v01["total_records"] < data_all["total_records"]


def test_planning_endpoints_with_new_filters(client: TestClient) -> None:
    """Verify workforce availability and shortage endpoints accept new filters."""
    # Availability
    res_avail = client.get(
        "/api/v1/planning/availability",
        params={
            "date": "2026-08-01",
            "employment_type": "permanent",
        },
    )
    assert res_avail.status_code == 200
    data_avail = res_avail.json()
    assert "available_count" in data_avail
    assert "total_scheduled" in data_avail

    # Shortages
    res_short = client.get(
        "/api/v1/planning/shortages",
        params={
            "date": "2026-08-01",
            "employment_type": "vendor",
            "vendor_id": "V01",
        },
    )
    assert res_short.status_code == 200
    data_short = res_short.json()
    assert "shortage_count" in data_short


def test_single_person_dependency_with_new_filters(client: TestClient) -> None:
    """Verify single-person dependency endpoint accepts new filters."""
    res = client.get(
        "/api/v1/intelligence/single-person-dependency",
        params={
            "date": "2026-08-01",
            "employment_type": "permanent",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data or "total_roles_analyzed" in data or "items" in data or "high_risk_count" in data


def test_analytics_endpoints_accept_employment_type_and_vendor(client: TestClient) -> None:
    """Verify all analytics endpoints accept employment_type and vendor_id without errors."""
    params = {
        "start_date": "2026-08-01",
        "end_date": "2026-08-07",
        "employment_type": "vendor",
        "vendor_id": "V01",
    }

    endpoints = [
        "/api/v1/analytics/overtime",
        "/api/v1/analytics/skills",
        "/api/v1/analytics/compliance",
        "/api/v1/analytics/gender",
        "/api/v1/analytics/departments",
        "/api/v1/analytics/experience",
        "/api/v1/analytics/new-joiners",
        "/api/v1/analytics/sections",
    ]

    for ep in endpoints:
        res = client.get(ep, params=params)
        assert res.status_code == 200, f"Endpoint {ep} failed with status {res.status_code}: {res.text}"

