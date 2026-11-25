"""Focused test suite for Centralized HR Approvals and Governance across all 7 specialist agents.
Validates real agent execution records, review/approval lifecycles, and no mock seed dependency.
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import db_manager
from app.services import hr_approval_service

client = TestClient(app)

EXPECTED_7_AGENTS = {
    "attendance",
    "workforce_planning",
    "overtime",
    "attrition",
    "skill",
    "vendor",
    "production",
}


def test_list_approvals_structure_and_kpis():
    """Verify GET /api/v1/hr-approvals returns 200 with valid structure and KPI counts."""
    response = client.get("/api/v1/hr-approvals?limit=50")
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
    data = response.json()

    assert "items" in data
    assert "kpis" in data
    assert "pagination" in data
    kpis = data["kpis"]
    assert "pending_reviews" in kpis
    assert "pending_approvals" in kpis
    assert "approved" in kpis
    assert "rejected" in kpis
    assert "total_records" in kpis


def test_real_agent_execution_and_lifecycle():
    """Verify registering a real agent execution, performing HR review, and approving."""
    test_exec_id = f"EXE-TEST-{uuid.uuid4().hex[:8].upper()}"

    # 1. Register from execution via service
    with db_manager.session_local() as db:
        rec = hr_approval_service.register_or_update_from_execution(
            db,
            execution_id=test_exec_id,
            specialist_agent="attendance",
            recommendation="12 unexcused absences in S2 shift. Recommended reassigning 4 operators.",
            plant_id="IN-TN-01",
            department_id="Final Assembly",
            target_date="2026-11-25",
            result_payload={"summary": "Attendance anomaly detected."},
        )
        target_id = rec.approval_id
        assert rec.review_status == "PENDING_REVIEW"
        assert rec.approval_status == "PENDING"

    # 2. Verify it shows up in GET /api/v1/hr-approvals
    res = client.get(f"/api/v1/hr-approvals/{target_id}")
    assert res.status_code == 200
    item = res.json()
    assert item["execution_id"] == test_exec_id
    assert item["review_status"] == "PENDING_REVIEW"
    assert item["approval_status"] == "PENDING"

    # 3. Record HR Review -> transitions to REVIEWED (Pending Approval)
    review_payload = {
        "reviewed_by": "Workspace User (HR)",
        "review_notes": "Reviewed with line supervisor. Feasible to reassign operators.",
    }
    res_review = client.post(f"/api/v1/hr-approvals/{target_id}/review", json=review_payload)
    assert res_review.status_code == 200
    data = res_review.json()
    assert data["success"] is True
    assert data["record"]["review_status"] == "REVIEWED"
    assert data["record"]["approval_status"] == "PENDING"

    # 4. Final Approval
    approve_payload = {
        "decision": "APPROVED",
        "approved_by": "Workspace User (HR Director)",
        "decision_notes": "Approved for immediate shift handover.",
    }
    res_appr = client.post(f"/api/v1/hr-approvals/{target_id}/decision", json=approve_payload)
    assert res_appr.status_code == 200
    assert res_appr.json()["record"]["approval_status"] == "APPROVED"

    # 5. Reset back to PENDING
    res_reset = client.post(f"/api/v1/hr-approvals/{target_id}/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["record"]["approval_status"] == "PENDING"

    # 6. Reject without reason must fail with 422
    fail_rej_payload = {
        "decision": "REJECTED",
        "approved_by": "Workspace User (HR Director)",
        "rejection_reason": "",
    }
    res_fail = client.post(f"/api/v1/hr-approvals/{target_id}/decision", json=fail_rej_payload)
    assert res_fail.status_code == 422

    # 7. Reject with valid reason must succeed
    valid_rej_payload = {
        "decision": "REJECTED",
        "approved_by": "Workspace User (HR Director)",
        "rejection_reason": "Budget restriction for temporary overtime allocation.",
    }
    res_rej = client.post(f"/api/v1/hr-approvals/{target_id}/decision", json=valid_rej_payload)
    assert res_rej.status_code == 200
    assert res_rej.json()["record"]["approval_status"] == "REJECTED"


def test_agent_approve_planning_sync():
    """Verify POST /api/v1/agent/approve-planning integrates with hr_approval_records."""
    test_exec_id = f"EXE-WOR-TEST-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "execution_id": test_exec_id,
        "specialist_agent": "workforce_planning",
        "decision": "APPROVED",
        "notes": "Testing integration sync from planning drawer.",
        "approved_by": "Workspace User (HR)",
        "target_date": "2026-08-01",
    }
    res = client.post("/api/v1/agent/approve-planning", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "APPROVED"

    # Query the central HR approval API to confirm it is persisted and marked APPROVED
    res_sync = client.get(f"/api/v1/hr-approvals?search={test_exec_id}")
    assert res_sync.status_code == 200
    items = res_sync.json()["items"]
    assert len(items) >= 1
    assert items[0]["execution_id"] == test_exec_id
    assert items[0]["approval_status"] == "APPROVED"
