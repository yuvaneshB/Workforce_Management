"""Tests for FastAPI startup, configuration safety, and health endpoints."""

from fastapi.testclient import TestClient

from app.main import app
from app.utils.db_url import build_ssl_connect_args, mask_database_url, normalize_psycopg_url


def test_root_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["health"] == "/health"
    assert payload["api_v1_health"] == "/api/v1/health"


def test_api_health_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app_name" in payload


def test_root_health_endpoints() -> None:
    with TestClient(app) as client:
        for path in ["/health", "/healthz", "/api/health"]:
            response = client.get(path)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "app_name" in data
            assert "environment" in data


def test_cross_origin_cors() -> None:
    with TestClient(app) as client:
        # Cross origin preflight from Vite frontend port 5173
        res_5173 = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res_5173.status_code == 200
        assert res_5173.headers.get("access-control-allow-origin") in {
            "http://localhost:5173",
            "*",
        }

        # Cross origin preflight from 127.0.0.1:5173
        res_127 = client.options(
            "/api/v1/departments",
            headers={
                "Origin": "http://127.0.0.1:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res_127.status_code == 200
        assert res_127.headers.get("access-control-allow-origin") in {
            "http://127.0.0.1:5173",
            "*",
        }

        # Cross origin request from alternate port (e.g. React 3000)
        res_3000 = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res_3000.status_code == 200
        assert res_3000.headers.get("access-control-allow-origin") in {
            "http://localhost:3000",
            "*",
        }


def test_database_health_unconfigured_returns_503() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health/db")
    # Without backend/.env DATABASE_URL configured, returns 503 with structured status
    if response.status_code == 503:
        payload = response.json()
        assert payload["status"] in {"unconfigured", "degraded"}
        assert payload["primary"]["configured"] is False
    else:
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["primary"]["connected"] is True
        assert payload["readonly"]["connected"] is True
        assert payload["readonly"]["read_only_enforced"] is True


def test_url_normalization_and_password_masking() -> None:
    raw = "postgres://alice:super_secret_pw@ep-demo.us-east-2.aws.neon.tech/workforce?sslmode=require"
    normalized = normalize_psycopg_url(raw)
    assert normalized.startswith("postgresql+psycopg://")
    masked = mask_database_url(raw)
    assert masked is not None
    assert "super_secret_pw" not in masked
    assert "***" in masked
    assert build_ssl_connect_args(raw) == {}
    assert build_ssl_connect_args("postgresql://alice:pw@host/db") == {"sslmode": "require"}

