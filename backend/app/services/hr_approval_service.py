"""Service layer for Centralized HR Approvals and Governance across all 7 specialist agents."""

import datetime as dt
import json
import logging
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.hr_approval import HrApprovalRecord
from app.schemas.common import PaginationMeta
from app.schemas.hr_approval import (
    HrApprovalItem,
    HrApprovalKPIs,
    HrApprovalListResponse,
)

logger = logging.getLogger(__name__)

# Canonical names and metadata for the 7 specialist agents
SPECIALIST_AGENTS = {
    "attendance": {
        "code": "attendance",
        "name": "Attendance Agent",
        "icon": "CalendarCheck",
    },
    "workforce_planning": {
        "code": "workforce_planning",
        "name": "Workforce Planning Agent",
        "icon": "Users",
    },
    "overtime": {
        "code": "overtime",
        "name": "Overtime Optimization Agent",
        "icon": "Clock",
    },
    "attrition": {
        "code": "attrition",
        "name": "Attrition Agent",
        "icon": "UserMinus",
    },
    "skill": {
        "code": "skill",
        "name": "Skill & Training Agent",
        "icon": "Award",
    },
    "vendor": {
        "code": "vendor",
        "name": "Vendor Workforce Agent",
        "icon": "Building2",
    },
    "production": {
        "code": "production",
        "name": "Production Workforce Agent",
        "icon": "Activity",
    },
}

def ensure_table(db: Session) -> None:
    """Safely ensure hr_approval_records table exists in Neon DB."""
    try:
        bind = db.get_bind()
        HrApprovalRecord.__table__.create(bind=bind, checkfirst=True)
    except Exception as exc:
        logger.warning("Could not auto-create hr_approval_records table: %s", exc)


ensure_table_and_seed = ensure_table


def get_approval_kpis(db: Session) -> HrApprovalKPIs:
    """Calculate the 4 core KPI metrics for the HR approval header cards."""
    ensure_table_and_seed(db)

    # 1. Pending Reviews: review_status == 'PENDING_REVIEW' and approval_status == 'PENDING'
    pending_reviews = (
        db.scalar(
            select(func.count(HrApprovalRecord.approval_id)).where(
                HrApprovalRecord.review_status == "PENDING_REVIEW",
                HrApprovalRecord.approval_status == "PENDING",
            )
        )
        or 0
    )

    # 2. Pending Approvals: review_status == 'REVIEWED' and approval_status == 'PENDING'
    pending_approvals = (
        db.scalar(
            select(func.count(HrApprovalRecord.approval_id)).where(
                HrApprovalRecord.review_status == "REVIEWED",
                HrApprovalRecord.approval_status == "PENDING",
            )
        )
        or 0
    )

    # 3. Approved: approval_status == 'APPROVED'
    approved = (
        db.scalar(
            select(func.count(HrApprovalRecord.approval_id)).where(
                HrApprovalRecord.approval_status == "APPROVED",
            )
        )
        or 0
    )

    # 4. Rejected: approval_status == 'REJECTED'
    rejected = (
        db.scalar(
            select(func.count(HrApprovalRecord.approval_id)).where(
                HrApprovalRecord.approval_status == "REJECTED",
            )
        )
        or 0
    )

    total_records = (
        db.scalar(select(func.count(HrApprovalRecord.approval_id))) or 0
    )

    return HrApprovalKPIs(
        pending_reviews=pending_reviews,
        pending_approvals=pending_approvals,
        approved=approved,
        rejected=rejected,
        total_records=total_records,
    )


def list_approval_records(
    db: Session,
    *,
    status_filter: str | None = None,
    agent_filter: str | None = None,
    plant_id: str | None = None,
    department_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    search: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> HrApprovalListResponse:
    """Retrieve filtered and paginated HR approval records alongside top KPI aggregates."""
    ensure_table_and_seed(db)

    query = select(HrApprovalRecord)

    # Filter by Status
    if status_filter and status_filter.strip():
        norm_status = status_filter.strip().upper()
        if norm_status in ("PENDING_REVIEW", "PENDING REVIEWS"):
            query = query.where(
                HrApprovalRecord.review_status == "PENDING_REVIEW",
                HrApprovalRecord.approval_status == "PENDING",
            )
        elif norm_status in ("PENDING_APPROVAL", "PENDING APPROVALS"):
            query = query.where(
                HrApprovalRecord.review_status == "REVIEWED",
                HrApprovalRecord.approval_status == "PENDING",
            )
        elif norm_status in ("APPROVED", "REJECTED"):
            query = query.where(HrApprovalRecord.approval_status == norm_status)
        elif norm_status == "PENDING":
            query = query.where(HrApprovalRecord.approval_status == "PENDING")

    # Filter by Specialist Agent
    if agent_filter and agent_filter.strip():
        agent_clean = agent_filter.strip().lower()
        # Allow either agent code (e.g. "attendance") or display name (e.g. "Attendance Agent")
        query = query.where(
            or_(
                HrApprovalRecord.specialist_agent.ilike(f"%{agent_clean}%"),
                HrApprovalRecord.agent_name.ilike(f"%{agent_clean}%"),
            )
        )

    # Filter by Plant
    if plant_id and plant_id.strip():
        query = query.where(HrApprovalRecord.plant_id == plant_id.strip())

    # Filter by Department
    if department_id and department_id.strip():
        query = query.where(HrApprovalRecord.department_id.ilike(f"%{department_id.strip()}%"))

    # Filter by Date
    if start_date and start_date.strip():
        query = query.where(
            or_(
                HrApprovalRecord.target_date >= start_date.strip(),
                func.to_char(HrApprovalRecord.created_at, "YYYY-MM-DD") >= start_date.strip(),
            )
        )
    if end_date and end_date.strip():
        query = query.where(
            or_(
                HrApprovalRecord.target_date <= end_date.strip(),
                func.to_char(HrApprovalRecord.created_at, "YYYY-MM-DD") <= end_date.strip(),
            )
        )

    # Search keyword
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                HrApprovalRecord.execution_id.ilike(s),
                HrApprovalRecord.recommendation.ilike(s),
                HrApprovalRecord.agent_name.ilike(s),
                HrApprovalRecord.reviewed_by.ilike(s),
                HrApprovalRecord.approved_by.ilike(s),
                HrApprovalRecord.department_id.ilike(s),
            )
        )

    # Count total matching
    total_matching = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    # Sort descending by updated_at or created_at
    records = (
        db.scalars(
            query.order_by(desc(HrApprovalRecord.created_at))
            .limit(limit)
            .offset(offset)
        )
        .all()
    )

    items = []
    for r in records:
        payload = None
        if r.result_payload:
            try:
                payload = json.loads(r.result_payload)
            except Exception:
                payload = r.result_payload

        items.append(
            HrApprovalItem(
                approval_id=r.approval_id,
                execution_id=r.execution_id,
                specialist_agent=r.specialist_agent,
                agent_name=r.agent_name,
                plant_id=r.plant_id,
                department_id=r.department_id,
                target_date=r.target_date,
                recommendation=r.recommendation,
                review_status=r.review_status,
                reviewed_by=r.reviewed_by,
                review_notes=r.review_notes,
                reviewed_at=r.reviewed_at,
                approval_status=r.approval_status,
                approved_by=r.approved_by,
                decision_date=r.decision_date,
                rejection_reason=r.rejection_reason,
                decision_notes=r.decision_notes,
                result_payload=payload,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )

    kpis = get_approval_kpis(db)

    return HrApprovalListResponse(
        items=items,
        kpis=kpis,
        pagination=PaginationMeta(
            total=total_matching,
            limit=limit,
            offset=offset,
            returned=len(items),
        ),
    )


def get_approval_by_id(db: Session, approval_id: str) -> HrApprovalItem:
    """Fetch single approval record by ID."""
    ensure_table_and_seed(db)
    rec = db.scalar(
        select(HrApprovalRecord).where(HrApprovalRecord.approval_id == approval_id.strip())
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HR approval record '{approval_id}' not found.",
        )

    payload = None
    if rec.result_payload:
        try:
            payload = json.loads(rec.result_payload)
        except Exception:
            payload = rec.result_payload

    return HrApprovalItem(
        approval_id=rec.approval_id,
        execution_id=rec.execution_id,
        specialist_agent=rec.specialist_agent,
        agent_name=rec.agent_name,
        plant_id=rec.plant_id,
        department_id=rec.department_id,
        target_date=rec.target_date,
        recommendation=rec.recommendation,
        review_status=rec.review_status,
        reviewed_by=rec.reviewed_by,
        review_notes=rec.review_notes,
        reviewed_at=rec.reviewed_at,
        approval_status=rec.approval_status,
        approved_by=rec.approved_by,
        decision_date=rec.decision_date,
        rejection_reason=rec.rejection_reason,
        decision_notes=rec.decision_notes,
        result_payload=payload,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


def record_review(
    db: Session,
    approval_id: str,
    *,
    reviewed_by: str,
    review_notes: str,
) -> HrApprovalItem:
    """Record initial HR review for an agent recommendation."""
    ensure_table_and_seed(db)
    rec = db.scalar(
        select(HrApprovalRecord).where(HrApprovalRecord.approval_id == approval_id.strip())
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HR approval record '{approval_id}' not found.",
        )

    rec.review_status = "REVIEWED"
    rec.reviewed_by = reviewed_by.strip()
    rec.review_notes = review_notes.strip()
    rec.reviewed_at = dt.datetime.utcnow()
    rec.updated_at = dt.datetime.utcnow()

    db.commit()
    db.refresh(rec)

    logger.info(
        "Recorded HR Review for approval_id=%s by '%s'",
        rec.approval_id,
        rec.reviewed_by,
    )
    return get_approval_by_id(db, rec.approval_id)


def record_decision(
    db: Session,
    approval_id: str,
    *,
    decision: str,
    approved_by: str,
    decision_notes: str | None = None,
    rejection_reason: str | None = None,
) -> HrApprovalItem:
    """Record final HR decision (APPROVED or REJECTED) for an agent recommendation."""
    ensure_table_and_seed(db)
    rec = db.scalar(
        select(HrApprovalRecord).where(HrApprovalRecord.approval_id == approval_id.strip())
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HR approval record '{approval_id}' not found.",
        )

    dec_upper = decision.strip().upper()
    if dec_upper not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail=f"Invalid decision '{decision}'. Must be APPROVED or REJECTED.",
        )

    if dec_upper == "REJECTED" and not (rejection_reason and rejection_reason.strip()):
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail="A rejection reason is required when rejecting an agent recommendation.",
        )

    # If not yet marked as reviewed, update review info as well
    if rec.review_status != "REVIEWED":
        rec.review_status = "REVIEWED"
        rec.reviewed_by = rec.reviewed_by or approved_by.strip()
        rec.reviewed_at = rec.reviewed_at or dt.datetime.utcnow()
        if not rec.review_notes:
            rec.review_notes = "Review and decision recorded simultaneously."

    rec.approval_status = dec_upper
    rec.approved_by = approved_by.strip()
    rec.decision_date = dt.datetime.utcnow()
    rec.decision_notes = decision_notes.strip() if decision_notes else None
    rec.rejection_reason = rejection_reason.strip() if dec_upper == "REJECTED" and rejection_reason else None
    rec.updated_at = dt.datetime.utcnow()

    db.commit()
    db.refresh(rec)

    logger.info(
        "Recorded HR Decision [%s] for approval_id=%s by '%s'",
        dec_upper,
        rec.approval_id,
        rec.approved_by,
    )
    return get_approval_by_id(db, rec.approval_id)


def reset_decision(db: Session, approval_id: str) -> HrApprovalItem:
    """Reset approval decision back to PENDING while retaining review notes."""
    ensure_table_and_seed(db)
    rec = db.scalar(
        select(HrApprovalRecord).where(HrApprovalRecord.approval_id == approval_id.strip())
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HR approval record '{approval_id}' not found.",
        )

    rec.approval_status = "PENDING"
    rec.approved_by = None
    rec.decision_date = None
    rec.rejection_reason = None
    rec.decision_notes = None
    rec.updated_at = dt.datetime.utcnow()

    db.commit()
    db.refresh(rec)

    logger.info("Reset HR Decision for approval_id=%s back to PENDING", rec.approval_id)
    return get_approval_by_id(db, rec.approval_id)


def register_or_update_from_execution(
    db: Session,
    *,
    execution_id: str,
    specialist_agent: str,
    recommendation: str,
    plant_id: str | None = None,
    department_id: str | None = None,
    target_date: str | None = None,
    result_payload: dict | None = None,
) -> HrApprovalItem:
    """Register or update an approval record directly when an agent run completes."""
    ensure_table_and_seed(db)
    rec = db.scalar(
        select(HrApprovalRecord).where(HrApprovalRecord.execution_id == execution_id.strip())
    )

    agent_info = SPECIALIST_AGENTS.get(
        specialist_agent,
        {"name": specialist_agent.replace("_", " ").title() + " Agent"},
    )
    agent_name = agent_info["name"]

    if rec:
        rec.recommendation = recommendation.strip()
        if plant_id:
            rec.plant_id = plant_id
        if department_id:
            rec.department_id = department_id
        if target_date:
            rec.target_date = target_date
        if result_payload:
            rec.result_payload = json.dumps(result_payload)
        rec.updated_at = dt.datetime.utcnow()
    else:
        approval_id = f"APV-{specialist_agent[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"
        rec = HrApprovalRecord(
            approval_id=approval_id,
            execution_id=execution_id.strip(),
            specialist_agent=specialist_agent,
            agent_name=agent_name,
            plant_id=plant_id,
            department_id=department_id,
            target_date=target_date,
            recommendation=recommendation.strip(),
            review_status="PENDING_REVIEW",
            approval_status="PENDING",
            result_payload=json.dumps(result_payload) if result_payload else None,
            created_at=dt.datetime.utcnow(),
            updated_at=dt.datetime.utcnow(),
        )
        db.add(rec)

    db.commit()
    db.refresh(rec)
    return get_approval_by_id(db, rec.approval_id)

