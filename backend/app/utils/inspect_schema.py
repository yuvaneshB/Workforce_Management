"""Read-only database schema inspection utility for discovering actual Neon tables."""

from typing import Any

from sqlalchemy import inspect, text

from app.core.database import db_manager


def inspect_public_schema() -> list[dict[str, Any]]:
    """Inspect existing tables, columns, primary keys, foreign keys, and row counts."""
    if db_manager.readonly_engine is None:
        raise RuntimeError("Read-only database engine is not configured.")

    inspector = inspect(db_manager.readonly_engine)
    tables_info: list[dict[str, Any]] = []

    with db_manager.readonly_engine.connect() as conn:
        for table_name in sorted(inspector.get_table_names(schema="public")):
            columns = [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": bool(col.get("nullable", True)),
                    "default": col.get("default"),
                }
                for col in inspector.get_columns(table_name, schema="public")
            ]
            pk = inspector.get_pk_constraint(table_name, schema="public")
            fks = [
                {
                    "constrained_columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", []),
                }
                for fk in inspector.get_foreign_keys(table_name, schema="public")
            ]
            row_count = conn.execute(
                text(f'SELECT COUNT(*) FROM "public"."{table_name}"')
            ).scalar_one()

            tables_info.append(
                {
                    "table": table_name,
                    "row_count": int(row_count),
                    "primary_key": pk.get("constrained_columns", []),
                    "foreign_keys": fks,
                    "columns": columns,
                }
            )
        conn.rollback()

    return tables_info

