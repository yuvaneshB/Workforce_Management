"""API endpoints for Centralized HR Approvals and Governance."""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.hr_approval import (
    HrApprovalActionResponse,
    HrApprovalItem,
    HrApprovalListResponse,
    HrDecisionRequest,
    HrReviewRequest,
)
from app.services import hr_approval_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hr-approvals", tags=["HR Approvals"])


@router.get(
    "",
    response_model=HrApprovalListResponse,
    summary="List centralized HR approvals with aggregate KPI metrics",
)
def list_approvals(
    status: str | None = Query(default=None, description="Filter: PENDING_REVIEW, PENDING_APPROVAL, APPROVED, REJECTED"),
    agent: str | None = Query(default=None, description="Filter by specialist agent code or display name"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-TN-01, IN-KA-01, IN-TN-02)"),
    department_id: str | None = Query(default=None, description="Filter by department"),
    start_date: str | None = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    search: str | None = Query(default=None, description="Free text search across execution ID, recommendation, reviewer"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> HrApprovalListResponse:
    """Retrieve paginated agent recommendation approval records and dashboard KPIs."""
    return hr_approval_service.list_approval_records(
        db,
        status_filter=status,
        agent_filter=agent,
        plant_id=plant_id,
        department_id=department_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{approval_id}",
    response_model=HrApprovalItem,
    summary="Get single HR approval record details",
)
def get_approval(
    approval_id: str,
    db: Session = Depends(get_db),
) -> HrApprovalItem:
    """Retrieve full details of an HR approval record by ID."""
    return hr_approval_service.get_approval_by_id(db, approval_id)


@router.post(
    "/{approval_id}/review",
    response_model=HrApprovalActionResponse,
    summary="Record initial HR review for an agent recommendation",
)
def record_review(
    approval_id: str,
    payload: HrReviewRequest,
    db: Session = Depends(get_db),
) -> HrApprovalActionResponse:
    """Record an HR reviewer's notes, transitioning status to REVIEWED (Pending Approval)."""
    updated_rec = hr_approval_service.record_review(
        db,
        approval_id,
        reviewed_by=payload.reviewed_by,
        review_notes=payload.review_notes,
    )
    return HrApprovalActionResponse(
        success=True,
        message=f"Initial HR review recorded by {payload.reviewed_by}. Recommendation is now pending final approval.",
        record=updated_rec,
    )


@router.post(
    "/{approval_id}/decision",
    response_model=HrApprovalActionResponse,
    summary="Record final HR decision (APPROVED or REJECTED)",
)
def record_decision(
    approval_id: str,
    payload: HrDecisionRequest,
    db: Session = Depends(get_db),
) -> HrApprovalActionResponse:
    """Record final HR approval decision with approver credentials and rationale."""
    updated_rec = hr_approval_service.record_decision(
        db,
        approval_id,
        decision=payload.decision,
        approved_by=payload.approved_by,
        decision_notes=payload.decision_notes,
        rejection_reason=payload.rejection_reason,
    )
    msg = (
        f"Recommendation successfully approved by {payload.approved_by}."
        if payload.decision == "APPROVED"
        else f"Recommendation rejected by {payload.approved_by}. Rationale recorded in audit trail."
    )
    return HrApprovalActionResponse(
        success=True,
        message=msg,
        record=updated_rec,
    )


@router.post(
    "/{approval_id}/reset",
    response_model=HrApprovalActionResponse,
    summary="Reset an HR decision back to PENDING",
)
def reset_decision(
    approval_id: str,
    db: Session = Depends(get_db),
) -> HrApprovalActionResponse:
    """Revert approval decision back to PENDING status while retaining review history."""
    updated_rec = hr_approval_service.reset_decision(db, approval_id)
    return HrApprovalActionResponse(
        success=True,
        message="Approval decision reset back to Pending status.",
        record=updated_rec,
    )

