"""Integration tests for attendance trend gender counts.

Verifies that:
1. Every trend item includes:
   - male_present_count
   - female_present_count
   - male_absent_count
   - female_absent_count
2. For small date ranges and multiple periods (daily, weekly, monthly):
   - male_present_count + female_present_count == present_count
   - male_absent_count + female_absent_count == absent_count
3. Works correctly with organizational filters (plant, shift, etc.).
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_attendance_trends_gender_counts_daily_equality(client: TestClient) -> None:
    """Verify for a small date range that gender present/absent counts sum to total present/absent."""
    res = client.get(
        "/api/v1/analytics/attendance",
        params={
            "period": "daily",
            "start_date": "2026-08-01",
            "end_date": "2026-08-07",
        },
    )
    assert res.status_code == 200
    data = res.json()
    trends = data["trends"]
    assert len(trends) == 7

    for pt in trends:
        assert isinstance(pt["male_present_count"], int)
        assert isinstance(pt["female_present_count"], int)
        assert isinstance(pt["male_absent_count"], int)
        assert isinstance(pt["female_absent_count"], int)

        assert pt["male_present_count"] >= 0
        assert pt["female_present_count"] >= 0
        assert pt["male_absent_count"] >= 0
        assert pt["female_absent_count"] >= 0

        # Exact gender sum assertions
        assert pt["male_present_count"] + pt["female_present_count"] == pt["present_count"]
        assert pt["male_absent_count"] + pt["female_absent_count"] == pt["absent_count"]


def test_attendance_trends_gender_counts_weekly_and_monthly(client: TestClient) -> None:
    """Verify weekly and monthly aggregation period gender counts."""
    # Weekly period
    res_w = client.get(
        "/api/v1/analytics/attendance",
        params={
            "period": "weekly",
            "start_date": "2026-08-01",
            "end_date": "2026-08-14",
        },
    )
    assert res_w.status_code == 200
    trends_w = res_w.json()["trends"]
    assert len(trends_w) > 0
    for pt in trends_w:
        assert pt["male_present_count"] + pt["female_present_count"] == pt["present_count"]
        assert pt["male_absent_count"] + pt["female_absent_count"] == pt["absent_count"]

    # Monthly period
    res_m = client.get(
        "/api/v1/analytics/attendance",
        params={
            "period": "monthly",
            "start_date": "2026-08-01",
            "end_date": "2026-09-30",
        },
    )
    assert res_m.status_code == 200
    trends_m = res_m.json()["trends"]
    assert len(trends_m) > 0
    for pt in trends_m:
        assert pt["male_present_count"] + pt["female_present_count"] == pt["present_count"]
        assert pt["male_absent_count"] + pt["female_absent_count"] == pt["absent_count"]


def test_attendance_trends_gender_counts_with_filters(client: TestClient) -> None:
    """Verify gender counts with plant, shift, and department filters."""
    res = client.get(
        "/api/v1/analytics/attendance",
        params={
            "period": "daily",
            "start_date": "2026-08-01",
            "end_date": "2026-08-03",
            "plant_id": "IN-TN-01",
            "shift_id": "A",
        },
    )
    assert res.status_code == 200
    trends = res.json()["trends"]
    assert len(trends) == 3
    for pt in trends:
        assert pt["male_present_count"] + pt["female_present_count"] == pt["present_count"]
        assert pt["male_absent_count"] + pt["female_absent_count"] == pt["absent_count"]

