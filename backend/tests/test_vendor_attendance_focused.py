"""Focused test suite for Vendor-wise Attendance performance metrics and filters."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

EXPECTED_VENDORS = {"V01", "V02", "V03", "V04", "V05", "V06"}


def test_vendor_attendance_present_and_structured():
    """Verify GET /api/v1/analytics/attendance returns populated by_vendor list with all 6 vendors."""
    response = client.get("/api/v1/analytics/attendance")
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    assert "by_vendor" in data
    by_vendor = data["by_vendor"]
    assert len(by_vendor) == 6, f"Expected 6 vendors, got {len(by_vendor)}"

    found_ids = {v["vendor_id"] for v in by_vendor}
    assert found_ids == EXPECTED_VENDORS

    for v in by_vendor:
        # Check required metrics
        assert v["vendor_id"] in EXPECTED_VENDORS
        assert v["vendor_name"] and len(v["vendor_name"]) > 2
        assert v["assigned_employees"] > 0
        assert v["total_records"] > 0
        assert v["present_count"] > 0
        assert 0.0 <= v["present_pct"] <= 100.0
        assert 0.0 <= v["absent_pct"] <= 100.0
        assert 0.0 <= v["leave_pct"] <= 100.0
        assert 0.0 <= v["late_pct"] <= 100.0
        assert 0.0 <= v["attendance_rate"] <= 100.0
        assert 0.0 <= v["absenteeism_rate"] <= 100.0

        # Verify backward-compatibility keys
        assert v["vendor"] == v["vendor_id"]
        assert v["fullName"] == v["vendor_name"]
        assert v["pct"] == v["attendance_rate"]
        assert v["present"] == v["present_count"]
        assert v["absent"] == v["absent_count"]
        assert v["total"] == v["total_records"]


def test_vendor_attendance_with_plant_filter():
    """Verify vendor attendance responds accurately to plant_id filter."""
    res_all = client.get("/api/v1/analytics/attendance")
    total_all_records = sum(v["total_records"] for v in res_all.json()["by_vendor"])

    res_plant = client.get("/api/v1/analytics/attendance?plant_id=IN-TN-01")
    assert res_plant.status_code == 200
    plant_vendors = res_plant.json()["by_vendor"]
    assert len(plant_vendors) > 0

    total_plant_records = sum(v["total_records"] for v in plant_vendors)
    assert total_plant_records < total_all_records, "Plant filter must restrict attendance volume"


def test_vendor_attendance_with_shift_filter():
    """Verify vendor attendance responds accurately to shift_id filter."""
    res_shift = client.get("/api/v1/analytics/attendance?shift_id=A")
    assert res_shift.status_code == 200
    shift_vendors = res_shift.json()["by_vendor"]
    assert len(shift_vendors) > 0
    for v in shift_vendors:
        assert v["total_records"] > 0
        assert 0.0 <= v["attendance_rate"] <= 100.0


def test_vendor_attendance_with_vendor_id_filter():
    """Verify vendor attendance isolates single vendor when vendor_id filter is applied."""
    res_single = client.get("/api/v1/analytics/attendance?vendor_id=V01")
    assert res_single.status_code == 200
    single_vendor = res_single.json()["by_vendor"]
    assert len(single_vendor) == 1
    assert single_vendor[0]["vendor_id"] == "V01"
    assert "Sri Vignesh" in single_vendor[0]["vendor_name"]


def test_vendor_attendance_with_date_range():
    """Verify vendor attendance respects start_date and end_date window."""
    res_date = client.get("/api/v1/analytics/attendance?start_date=2026-08-01&end_date=2026-08-31")
    assert res_date.status_code == 200
    date_vendors = res_date.json()["by_vendor"]
    assert len(date_vendors) == 6

    for v in date_vendors:
        assert v["total_records"] > 0
        assert v["total_records"] < 5000  # 1-month subset


def test_other_attendance_analytics_intact():
    """Confirm existing attendance metrics (trends, shifts, status) are unaffected."""
    res = client.get("/api/v1/analytics/attendance")
    assert res.status_code == 200
    data = res.json()
    assert len(data["trends"]) > 0
    assert len(data["shift_breakdown"]) > 0
    assert len(data["by_status"]) > 0
    assert len(data["by_plant"]) > 0
    assert data["total_records"] > 0
    assert data["attendance_rate"] > 0

