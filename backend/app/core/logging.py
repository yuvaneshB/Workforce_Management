"""Logging configuration for the FastAPI backend."""

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure consistent application logging."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    # Keep SQLAlchemy engine logs quiet unless explicitly debugging.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

