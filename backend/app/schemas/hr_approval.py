"""Pydantic schemas for Centralized HR Approvals and Governance."""

import datetime as dt
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import PaginationMeta


class HrApprovalItem(BaseModel):
    """Individual HR approval record representing an agent recommendation."""

    model_config = ConfigDict(from_attributes=True)

    approval_id: str
    execution_id: str
    specialist_agent: str
    agent_name: str
    plant_id: str | None = None
    department_id: str | None = None
    target_date: str | None = None
    recommendation: str

    # Review fields
    review_status: str
    reviewed_by: str | None = None
    review_notes: str | None = None
    reviewed_at: dt.datetime | None = None

    # Approval decision fields
    approval_status: str
    approved_by: str | None = None
    decision_date: dt.datetime | None = None
    rejection_reason: str | None = None
    decision_notes: str | None = None

    # Full parsed findings/evidence payload
    result_payload: Any | None = None

    created_at: dt.datetime
    updated_at: dt.datetime


class HrApprovalKPIs(BaseModel):
    """Top-level aggregate KPIs for the HR Approval dashboard."""

    pending_reviews: int = Field(..., ge=0)
    pending_approvals: int = Field(..., ge=0)
    approved: int = Field(..., ge=0)
    rejected: int = Field(..., ge=0)
    total_records: int = Field(..., ge=0)


class HrApprovalListResponse(BaseModel):
    """Paginated list response containing records and top KPI metrics."""

    items: list[HrApprovalItem]
    kpis: HrApprovalKPIs
    pagination: PaginationMeta


class HrReviewRequest(BaseModel):
    """Payload to record an HR initial review for an agent recommendation."""

    reviewed_by: str = Field(..., min_length=2, max_length=128, description="Name and title of the HR reviewer")
    review_notes: str = Field(..., min_length=3, description="HR review observations and preliminary assessment")


class HrDecisionRequest(BaseModel):
    """Payload to record an HR final decision (Approve or Reject)."""

    decision: Literal["APPROVED", "REJECTED"]
    approved_by: str = Field(..., min_length=2, max_length=128, description="Name and title of the HR approver")
    decision_notes: str | None = Field(default=None, description="Optional implementation notes or conditions")
    rejection_reason: str | None = Field(default=None, description="Mandatory if decision is REJECTED")


class HrApprovalActionResponse(BaseModel):
    """Response returned upon review or decision mutation."""

    success: bool
    message: str
    record: HrApprovalItem

