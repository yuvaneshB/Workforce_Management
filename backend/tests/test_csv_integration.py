"""Focused test for complete enterprise CSV-to-Neon PostgreSQL schema migration and database grounding."""

import os
import csv
import pytest
from app.core.database import db_manager
from sqlalchemy import text

CSV_DIR = os.path.abspath('backend/app/data')

TABLE_CSV_MAP = {
    'plant_master': 'plant_master.csv',
    'department_master': 'department_master.csv',
    'section_master': 'section_master.csv',
    'vendor_master': 'vendor_master.csv',
    'shift_master': 'shift_master.csv',
    'employee_master': 'employee_master.csv',
    'employee_department_mapping': 'employee_department_mapping.csv',
    'employee_section_mapping': 'employee_section_mapping.csv',
    'employee_vendor_mapping': 'employee_vendor_mapping.csv',
    'employee_experience': 'employee_experience.csv',
    'employee_skill_mapping': 'employee_skill_mapping.csv',
    'employee_training': 'employee_training.csv',
    'employee_shift_roster': 'employee_shift_roster.csv',
    'workforce_requirement': 'workforce_requirement.csv',
    'attrition_transactions': 'attrition_transactions.csv',
    'overtime_transactions': 'overtime_transactions.csv',
    'production_transactions': 'production_transactions.csv',
    'attendance_transactions': 'attendance_transactions.csv',
}


def test_all_18_csv_files_exist_and_non_empty():
    for table_name, fname in TABLE_CSV_MAP.items():
        fpath = os.path.join(CSV_DIR, fname)
        assert os.path.isfile(fpath), f"Missing CSV: {fname}"
        assert os.path.getsize(fpath) > 0, f"CSV is empty: {fname}"


def test_old_prototype_tables_dropped_from_active_public_schema():
    assert db_manager.engine is not None
    with db_manager.engine.connect() as conn:
        old_tables = [
            "dim_workforce",
            "dim_shift_calendar",
            "fact_workforce_attendance",
            "fact_hourly_production"
        ]
        for tbl in old_tables:
            exists = conn.execute(
                text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :t"),
                {"t": tbl}
            ).scalar()
            assert exists is None, f"Old prototype table '{tbl}' should NOT exist in public schema"


def test_enterprise_tables_row_counts_match_csvs_exactly():
    assert db_manager.engine is not None
    with db_manager.engine.connect() as conn:
        for table_name, fname in TABLE_CSV_MAP.items():
            fpath = os.path.join(CSV_DIR, fname)
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                csv_cnt = sum(1 for _ in csv.DictReader(f))

            db_cnt = conn.execute(text(f"SELECT count(*) FROM public.{table_name}")).scalar()
            assert db_cnt == csv_cnt, f"Table '{table_name}' count mismatch: CSV={csv_cnt}, DB={db_cnt}"


def test_pre_migration_backup_exists_and_verified():
    assert db_manager.engine is not None
    with db_manager.engine.connect() as conn:
        backup_exists = conn.execute(
            text("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'prototype_backup'")
        ).scalar()
        assert backup_exists == 1, "Backup schema 'prototype_backup' must exist in Neon database"

        backup_dim_workforce = conn.execute(
            text("SELECT count(*) FROM prototype_backup.dim_workforce")
        ).scalar()
        assert backup_dim_workforce == 180, f"Backup dim_workforce expected 180 rows, got {backup_dim_workforce}"


def test_enterprise_employee_master_data_grounding():
    assert db_manager.engine is not None
    with db_manager.engine.connect() as conn:
        # Verify 1,700 enterprise employees exist
        total_emp = conn.execute(text("SELECT count(*) FROM public.employee_master")).scalar()
        assert total_emp == 1700, f"Expected 1700 employees, found {total_emp}"

        # Verify old 180 prototype employees do not exist in active employee_master
        old_emp_exists = conn.execute(
            text("SELECT count(*) FROM public.employee_master WHERE employee_id LIKE 'EMP-00%'")
        ).scalar()
        assert old_emp_exists == 0, f"Old prototype employees found in employee_master: {old_emp_exists}"

        # Verify new enterprise employee ID range
        new_emp_exists = conn.execute(
            text("SELECT count(*) FROM public.employee_master WHERE employee_id LIKE 'EMP-1%'")
        ).scalar()
        assert new_emp_exists == 1700, f"Enterprise employees matching EMP-1%: {new_emp_exists}"
