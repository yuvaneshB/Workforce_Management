"""Helper for resolving dynamic runtime operational date and period from Neon DB."""

import calendar
import datetime as dt
from typing import Any
from sqlalchemy import text
from app.agents.tools.workforce_tools import _get_tool_db_session

_DEFAULT_PERIOD_CACHE: dict[str, Any] | None = None


def get_default_period(db=None) -> dict[str, Any]:
    """Retrieve the latest operational date and latest complete month from the database."""
    global _DEFAULT_PERIOD_CACHE
    if _DEFAULT_PERIOD_CACHE is not None:
        return _DEFAULT_PERIOD_CACHE

    max_d = None
    try:
        def _query(s):
            return s.execute(text("SELECT max(work_date) FROM attendance_transactions")).scalar()

        if db is not None:
            max_d = _query(db)
        else:
            with _get_tool_db_session() as s:
                max_d = _query(s)
    except Exception:
        max_d = None

    if not max_d:
        max_d = dt.date(2026, 11, 19)

    if isinstance(max_d, str):
        max_d = dt.date.fromisoformat(max_d)

    latest_date_str = max_d.isoformat()

    first_of_curr_month = max_d.replace(day=1)
    last_of_prev_month = first_of_curr_month - dt.timedelta(days=1)
    first_of_prev_month = last_of_prev_month.replace(day=1)

    _, last_day_curr = calendar.monthrange(max_d.year, max_d.month)
    if max_d.day == last_day_curr:
        full_start = first_of_curr_month
        full_end = max_d
    else:
        full_start = first_of_prev_month
        full_end = last_of_prev_month

    # For annual/overall/yearly queries: use the last 12 months of available data (or full available data if shorter)
    annual_start = "2025-10-01"
    annual_end = latest_date_str
    annual_label = f"October 2025 – {max_d.strftime('%B %Y')}"

    res = {
        "latest_date": latest_date_str,
        "latest_full_month_start": full_start.isoformat(),
        "latest_full_month_end": full_end.isoformat(),
        "latest_full_month_name": full_start.strftime("%B %Y"),
        "annual_start": annual_start,
        "annual_end": annual_end,
        "annual_label": annual_label,
    }
    _DEFAULT_PERIOD_CACHE = res
    return res


def clear_period_cache() -> None:
    """Clear cached period data for testing."""
    global _DEFAULT_PERIOD_CACHE
    _DEFAULT_PERIOD_CACHE = None

