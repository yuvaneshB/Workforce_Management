"""Integration and unit tests for ORM models, read-only enforcement, and workforce APIs."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, text
from sqlalchemy.exc import InternalError

from app.core.database import get_readonly_db
from app.main import app
from app.models import HourlyProduction, ShiftCalendar, Workforce, WorkforceAttendance


def test_orm_model_mappings() -> None:
    """Verify ORM models map exact existing public schema tables, PKs, and FKs."""
    assert Workforce.__tablename__ == "dim_workforce"
    assert ShiftCalendar.__tablename__ == "dim_shift_calendar"
    assert WorkforceAttendance.__tablename__ == "fact_workforce_attendance"
    assert HourlyProduction.__tablename__ == "fact_hourly_production"

    wf_pk = [col.name for col in inspect(Workforce).primary_key]
    sc_pk = [col.name for col in inspect(ShiftCalendar).primary_key]
    att_pk = [col.name for col in inspect(WorkforceAttendance).primary_key]
    prod_pk = [col.name for col in inspect(HourlyProduction).primary_key]

    assert wf_pk == ["employee_id"]
    assert sc_pk == ["calendar_date", "shift_id"]
    assert att_pk == ["attendance_id"]
    assert prod_pk == ["event_id"]

    assert len(Workforce.__table__.columns) == 7
    assert len(ShiftCalendar.__table__.columns) == 7
    assert len(WorkforceAttendance.__table__.columns) == 11
    assert len(HourlyProduction.__table__.columns) == 23


def test_swagger_docs_and_database_status() -> None:
    """Verify Swagger /docs and /api/v1/database/status endpoints."""
    with TestClient(app) as client:
        docs_res = client.get("/docs")
        assert docs_res.status_code == 200

        db_res = client.get("/api/v1/database/status")
        assert db_res.status_code == 200
        payload = db_res.json()
        assert payload["status"] == "ok"
        assert payload["primary"]["connected"] is True
        assert payload["readonly"]["connected"] is True
        assert payload["readonly"]["read_only_enforced"] is True
        assert set(payload["discovered_tables"]) >= {
            "dim_workforce",
            "dim_shift_calendar",
            "fact_workforce_attendance",
            "fact_hourly_production",
        }


def test_employees_list_pagination_filtering_and_detail() -> None:
    """Verify GET /api/v1/employees and GET /api/v1/employees/{employee_id}."""
    with TestClient(app) as client:
        res = client.get("/api/v1/employees", params={"limit": 10, "offset": 0})
        assert res.status_code == 200
        data = res.json()
        assert data["pagination"]["total"] == 180
        assert data["pagination"]["returned"] == 10
        assert len(data["items"]) == 10

        first_emp = data["items"][0]
        detail_res = client.get(f"/api/v1/employees/{first_emp['employee_id']}")
        assert detail_res.status_code == 200
        assert detail_res.json()["employee_id"] == first_emp["employee_id"]

        filtered = client.get("/api/v1/employees", params={"home_shift": "A", "limit": 100})
        assert filtered.status_code == 200
        assert filtered.json()["pagination"]["total"] == 60
        assert all(item["home_shift"] == "A" for item in filtered.json()["items"])

        not_found = client.get("/api/v1/employees/EMP-999999")
        assert not_found.status_code == 404


def test_workforce_summary() -> None:
    """Verify GET /api/v1/workforce/summary reflects actual Neon records."""
    with TestClient(app) as client:
        res = client.get("/api/v1/workforce/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_employees"] == 180
    assert data["active_employees"] == 180
    assert data["distinct_teams"] == 18
    assert data["attendance_coverage_window"] == {
        "min_date": "2026-08-01",
        "max_date": "2026-10-31",
    }
    assert data["production_coverage_window"] == {
        "min_date": "2026-08-01",
        "max_date": "2026-10-31",
    }


def test_shifts_retrieval_and_filtering() -> None:
    """Verify GET /api/v1/shifts with date range and shift filtering."""
    with TestClient(app) as client:
        res = client.get(
            "/api/v1/shifts",
            params={"start_date": "2026-08-01", "end_date": "2026-08-03", "shift_id": "A"},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["pagination"]["total"] == 3
    assert all(item["shift_id"] == "A" for item in data["items"])


def test_attendance_retrieval_and_quality_warnings() -> None:
    """Verify GET /api/v1/attendance preserves source records and exposes data-quality warnings."""
    with TestClient(app) as client:
        res = client.get(
            "/api/v1/attendance",
            params={"attendance_status": "ABSENT", "limit": 5},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["pagination"]["total"] == 554
    assert len(data["items"]) == 5
    warning_codes = {w["code"]: w["affected_records"] for w in data["data_quality_warnings"]}
    assert warning_codes["ABSENT_WITH_ACTUAL_HOURS"] == 540


def test_attendance_analytics() -> None:
    """Verify GET /api/v1/analytics/attendance totals and warnings."""
    with TestClient(app) as client:
        res = client.get("/api/v1/analytics/attendance")
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 16560
    assert data["distinct_employees"] == 180
    warnings = {w["code"]: w["affected_records"] for w in data["data_quality_warnings"]}
    assert warnings["ABSENT_WITH_ACTUAL_HOURS"] == 540
    assert warnings["LEAVE_WITH_ACTUAL_HOURS"] == 465
    assert warnings["PRESENT_WITH_ZERO_ACTUAL_HOURS"] == 381
    assert warnings["LATE_WITH_ZERO_ACTUAL_HOURS"] == 11


def test_attendance_analytics_period_filters() -> None:
    """Verify daily, weekly, and monthly period aggregations and shift breakdown."""
    with TestClient(app) as client:
        daily = client.get("/api/v1/analytics/attendance", params={"period": "daily"})
        weekly = client.get("/api/v1/analytics/attendance", params={"period": "weekly"})
        monthly = client.get("/api/v1/analytics/attendance", params={"period": "monthly"})
        invalid = client.get("/api/v1/analytics/attendance", params={"period": "yearly"})

    assert daily.status_code == 200
    assert weekly.status_code == 200
    assert monthly.status_code == 200
    assert invalid.status_code == 422

    d_json = daily.json()
    w_json = weekly.json()
    m_json = monthly.json()

    assert d_json["period"] == "daily"
    assert len(d_json["trends"]) == 92
    assert len(d_json["weekly_comparison"]) == len(w_json["trends"])
    assert len(d_json["shift_breakdown"]) == 3

    assert w_json["period"] == "weekly"
    assert len(w_json["trends"]) > 0
    assert sum(pt["total_records"] for pt in w_json["trends"]) == 16560

    assert m_json["period"] == "monthly"
    assert len(m_json["trends"]) == 3
    assert sum(pt["total_records"] for pt in m_json["trends"]) == 16560
    assert sum(pt["present_count"] for pt in m_json["trends"]) == 15139
    assert sum(pt["absent_count"] for pt in m_json["trends"]) == 554


def test_search_and_organization_endpoints() -> None:
    """Verify search on employees/attendance and safe empty responses for unimported org tables."""
    with TestClient(app) as client:
        emp_res = client.get("/api/v1/employees", params={"search": "EMP-0001"})
        assert emp_res.status_code == 200
        assert emp_res.json()["pagination"]["total"] == 1

        att_res = client.get("/api/v1/attendance", params={"search": "EMP-0001", "limit": 5})
        assert att_res.status_code == 200
        assert att_res.json()["pagination"]["total"] == 92

        for endpoint in ["/api/v1/departments", "/api/v1/sections"]:
            org_res = client.get(endpoint)
            assert org_res.status_code == 200
            body = org_res.json()
            assert body["dataset_available"] is True
            assert len(body["items"]) > 0

        # Vendor endpoints are completely removed
        assert client.get("/api/v1/vendors").status_code == 404


def test_five_analytics_endpoints() -> None:
    """Verify gender, department, experience, new-joiners, and section analytics (vendor removed)."""
    with TestClient(app) as client:
        g = client.get("/api/v1/analytics/gender")
        d = client.get("/api/v1/analytics/departments")
        e = client.get("/api/v1/analytics/experience")
        nj = client.get("/api/v1/analytics/new-joiners")
        s = client.get("/api/v1/analytics/sections")
        v = client.get("/api/v1/analytics/vendors")

    for res in (g, d, e, nj, s):
        assert res.status_code == 200
    assert v.status_code == 404

    assert g.json()["total_employees"] == 180
    assert sum(b["employee_count"] for b in g.json()["buckets"]) == 180
    assert sum(i["employee_count"] for i in d.json()["items"]) == 180
    assert sum(i["employee_count"] for i in e.json()["items"]) == 180
    assert nj.json()["anchor_date"] == "2026-08-01"
    assert nj.json()["total_new_joiners"] == 22
    assert sum(i["employee_count"] for i in s.json()["items"]) == 180


def test_production_retrieval_and_analytics() -> None:
    """Verify GET /api/v1/production and GET /api/v1/analytics/production."""
    with TestClient(app) as client:
        list_res = client.get(
            "/api/v1/production",
            params={"plant_id": "IN-KA-01", "line_id": "SMT-L2", "limit": 5},
        )
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["pagination"]["total"] == 2208
        assert len(list_data["items"]) == 5

        analytics_res = client.get("/api/v1/analytics/production")
        assert analytics_res.status_code == 200
        analytics = analytics_res.json()
        assert analytics["total_events"] == 8832
        assert analytics["total_actual_qty"] == 1217813 + 1206371
        assert analytics["total_good_qty"] == 1195188 + 1183772


def test_empty_result_handling() -> None:
    """Verify valid queries matching 0 rows return HTTP 200 with empty items."""
    with TestClient(app) as client:
        res = client.get("/api/v1/employees", params={"team_id": "TEAM-DOES-NOT-EXIST"})
        assert res.status_code == 200
        assert res.json()["items"] == []
        assert res.json()["pagination"]["total"] == 0

        att_res = client.get(
            "/api/v1/attendance",
            params={"start_date": "2020-01-01", "end_date": "2020-01-02"},
        )
        assert att_res.status_code == 200
        assert att_res.json()["items"] == []
        assert att_res.json()["pagination"]["total"] == 0


def test_invalid_query_parameters() -> None:
    """Verify invalid dates, bounds, sort fields, and reversed date ranges return 422."""
    with TestClient(app) as client:
        assert client.get("/api/v1/employees", params={"limit": 0}).status_code == 422
        assert client.get("/api/v1/employees", params={"offset": -1}).status_code == 422
        assert client.get("/api/v1/employees", params={"sort_by": "invalid_col"}).status_code == 422
        assert (
            client.get(
                "/api/v1/attendance",
                params={"start_date": "2026-09-10", "end_date": "2026-09-01"},
            ).status_code
            == 422
        )
        assert (
            client.get("/api/v1/production", params={"start_date": "not-a-date"}).status_code
            == 422
        )


def test_readonly_database_and_http_enforcement() -> None:
    """Verify read-only DB session blocks DML and API rejects write HTTP methods."""
    gen = get_readonly_db()
    db = next(gen)
    try:
        with pytest.raises(InternalError):
            db.execute(
                text(
                    "INSERT INTO public.dim_workforce "
                    "(employee_id, team_id, role, skill_grade, certification, home_shift, active_status) "
                    "VALUES ('EMP-TEST', 'TEAM-01', 'Operator', 'L1', 'ESD', 'A', 'ACTIVE')"
                )
            )
    finally:
        gen.close()

    with TestClient(app) as client:
        assert client.post("/api/v1/employees", json={}).status_code == 405
        assert client.delete("/api/v1/employees/EMP-0001").status_code == 405

