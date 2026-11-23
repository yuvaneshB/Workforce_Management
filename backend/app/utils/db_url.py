"""Helpers for normalizing and safely masking PostgreSQL connection URLs."""

from urllib.parse import parse_qs, urlparse

from sqlalchemy.engine import make_url


def normalize_psycopg_url(raw_url: str) -> str:
    """Ensure a PostgreSQL connection string uses the SQLAlchemy psycopg3 driver."""
    cleaned = raw_url.strip()
    if cleaned.startswith("postgres://"):
        return "postgresql+psycopg://" + cleaned[len("postgres://") :]
    if cleaned.startswith("postgresql+psycopg2://"):
        return "postgresql+psycopg://" + cleaned[len("postgresql+psycopg2://") :]
    if cleaned.startswith("postgresql://"):
        return "postgresql+psycopg://" + cleaned[len("postgresql://") :]
    return cleaned


def build_ssl_connect_args(raw_url: str, default_ssl_mode: str = "require") -> dict[str, str]:
    """Provide default SSL mode unless already specified in the connection URL."""
    parsed = urlparse(raw_url)
    query_params = parse_qs(parsed.query)
    if "sslmode" in query_params:
        return {}
    return {"sslmode": default_ssl_mode}


def mask_database_url(raw_url: str | None) -> str | None:
    """Return a safe representation of the database URL with any password masked."""
    if not raw_url:
        return None
    try:
        url = make_url(normalize_psycopg_url(raw_url))
        return url.render_as_string(hide_password=True)
    except Exception:
        return "<invalid-database-url>"

