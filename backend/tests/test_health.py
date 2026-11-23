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
    assert payload["health"] == "/api/v1/health"


def test_api_health_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app_name" in payload


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

