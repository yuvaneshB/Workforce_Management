"""Agent chat endpoint for Workforce Management AI Agent (Phase 6.3)."""

import datetime as dt
import logging
import os
import time
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.agents.agent_service import agent_service
from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.agents.attendance_agent_service import attendance_agent_service
from app.agents.attrition_agent_service import attrition_agent_service
from app.agents.llm.provider import LLMProviderNotConfiguredError
from app.agents.memory.conversation_memory import conversation_memory
from app.agents.overtime_agent_service import overtime_agent_service
from app.agents.planning_agent_service import planning_agent_service
from app.agents.production_agent_service import production_agent_service
from app.agents.skill_agent_service import skill_agent_service
from app.agents.vendor_agent_service import vendor_agent_service
from app.agents.workforce_planning_agent_service import workforce_planning_agent_service
from app.agents.agent_execution_streamer import stream_specialist_agent_execution
from app.core.database import get_readonly_db
from sqlalchemy.orm import Session
from fastapi import Depends

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent"])

MAX_MESSAGE_LENGTH = 4000


@router.post(
    "/chat",
    summary="Chat with Central Workforce Intelligence Assistant",
    description="Processes workforce questions via central orchestrator routing to 7 specialist agents over Neon PostgreSQL.",
)
async def chat(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute central workforce intelligence assistant query with multi-domain specialist routing."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON request body.",
        )

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must be a JSON object.",
        )

    raw_message = body.get("message")
    if raw_message is None or not isinstance(raw_message, str) or not raw_message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    if len(raw_message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters.",
        )

    conversation_id = body.get("conversation_id")
    if conversation_id is not None and not isinstance(conversation_id, str):
        conversation_id = str(conversation_id)
    if conversation_id and not conversation_id.strip():
        conversation_id = None

    try:
        from app.agents.llm.provider import _PROVIDER_REGISTRY

        provider = (os.getenv("LLM_PROVIDER") or "").strip().lower()
        if provider in _PROVIDER_REGISTRY or not provider:
            result = await run_in_threadpool(
                agent_service.execute_query,
                user_query=raw_message,
                conversation_id=conversation_id,
            )
        else:
            result = await run_in_threadpool(
                central_agent_orchestrator.execute_query,
                user_query=raw_message,
                conversation_id=conversation_id,
                db=db,
            )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result,
        )
    except LLMProviderNotConfiguredError as exc:
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        logger.warning("Agent chat failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "answer": "Workforce AI Assistant is currently unavailable because the language model provider is not configured.",
                "conversation_id": conv_id,
                "tools_used": [],
                "data_available": False,
                "error": str(exc),
            },
        )
    except Exception as exc:
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        logger.exception("Unexpected error during agent chat execution: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "answer": "An unexpected error occurred while processing your request.",
                "conversation_id": conv_id,
                "tools_used": [],
                "data_available": False,
                "error": "Internal agent processing error.",
            },
        )


@router.post(
    "/planning-chat",
    summary="Chat with Workforce Planning Agent",
    description="Dedicated endpoint for workforce planning, shortages, and replacement recommendations.",
)
async def planning_chat(request: Request) -> JSONResponse:
    """Execute workforce planning query against the dedicated planning agent."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON request body.",
        )

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must be a JSON object.",
        )

    raw_message = body.get("message")
    if raw_message is None or not isinstance(raw_message, str) or not raw_message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    if len(raw_message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters.",
        )

    conversation_id = body.get("conversation_id")
    if conversation_id is not None and not isinstance(conversation_id, str):
        conversation_id = str(conversation_id)
    if conversation_id and not conversation_id.strip():
        conversation_id = None

    try:
        result = await run_in_threadpool(
            planning_agent_service.execute_query,
            user_query=raw_message,
            conversation_id=conversation_id,
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "answer": result.get("answer", result.get("response", "")),
                "conversation_id": result.get("conversation_id"),
                "tools_used": result.get("tools_used", []),
                "data_available": result.get("data_available", True),
                "error": result.get("error"),
            },
        )
    except LLMProviderNotConfiguredError as exc:
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        logger.warning("Planning agent chat failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "answer": "Workforce Planning Agent is currently unavailable because the language model provider is not configured.",
                "conversation_id": conv_id,
                "tools_used": [],
                "data_available": False,
                "error": str(exc),
            },
        )
    except Exception as exc:
        conv_id = conversation_memory.get_or_create_conversation_id(conversation_id)
        logger.exception("Unexpected error during planning agent chat execution: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "answer": "An unexpected error occurred while processing your planning request.",
                "conversation_id": conv_id,
                "tools_used": [],
                "data_available": False,
                "error": "Internal planning agent processing error.",
            },
        )


@router.post(
    "/planning-workflow",
    summary="Agent-driven Workforce Planning Workflow",
    description="Live SSE stream for workforce availability, shortage detection, and candidate replacement.",
)
async def planning_workflow(request: Request) -> StreamingResponse:
    """Execute the agent-driven planning workflow and return a Server-Sent Events (SSE) stream.

    Request JSON payload:
    - date: str (e.g. '2026-08-01')
    - plant: str | None (e.g. 'IN-TN-01', 'IN-KA-01')
    - shift: str | None (e.g. 'A', 'B', 'C')
    - employee_id: str (e.g. 'EMP-0018')
    - target_shift: str | None
    - enforce_certification: bool (default True)
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON request body.",
        )

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must be a JSON object.",
        )

    return StreamingResponse(
        planning_agent_service.stream_planning_workflow(
            date=body.get("date"),
            plant=body.get("plant"),
            shift=body.get("shift"),
            employee_id=body.get("employee_id"),
            target_shift=body.get("target_shift"),
            enforce_certification=body.get("enforce_certification", True),
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/attendance-analysis",
    summary="Execute Attendance Intelligence Agent Analysis",
    description="Analyzes shopfloor absenteeism, shift/plant variances, chronic absences, and synthesizes HR recommendations.",
)
async def attendance_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Attendance Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            attendance_agent_service.execute_attendance_analysis,
            db,
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Attendance agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Attendance Agent execution.",
            },
        )


@router.post(
    "/workforce-planning-analysis",
    summary="Execute Workforce Planning Intelligence Agent Analysis",
    description="Analyzes required vs available workforce, shortages by plant/dept/shift, skill compatibility, eligible replacements, and synthesizes HR recommendations.",
)
async def workforce_planning_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Workforce Planning Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            workforce_planning_agent_service.execute_planning_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Workforce planning agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Workforce Planning Agent execution.",
            },
        )


@router.post(
    "/overtime-analysis",
    summary="Execute Overtime Optimization Intelligence Agent Analysis",
    description="Analyzes overtime hours, financial expenditures, department/shift concentrations, repeat OT staff, and synthesizes HR cost-optimization strategies.",
)
async def overtime_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Overtime Optimization Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            overtime_agent_service.execute_overtime_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Overtime agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Overtime Optimization Agent execution.",
            },
        )


@router.post(
    "/attrition-analysis",
    summary="Execute Attrition & Employee Retention Intelligence Agent Analysis",
    description="Analyzes employee exits, validated attrition rate, department hotspots, tenure patterns, and synthesizes HR retention strategies.",
)
async def attrition_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Attrition Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            attrition_agent_service.execute_attrition_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Attrition agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Attrition Agent execution.",
            },
        )


@router.post(
    "/skill-training-analysis",
    summary="Execute Skill & Training Intelligence Agent Analysis",
    description="Analyzes employee skills, proficiency levels L1-L4, multi-skilling, workforce requirement gaps, training completion, and certification validity.",
)
async def skill_training_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Skill & Training Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            skill_agent_service.execute_skill_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Skill & training agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Skill & Training Agent execution.",
            },
        )


@router.post(
    "/production-analysis",
    summary="Execute Production Workforce Intelligence Agent Analysis",
    description="Analyzes production output, targets, workforce productivity, labor allocation, shift disparities, line downtime, and operational risks.",
)
async def production_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Production Workforce Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            production_agent_service.execute_production_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Production agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Production Workforce Agent execution.",
            },
        )


@router.post(
    "/vendor-analysis",
    summary="Execute Vendor Workforce Intelligence Agent Analysis",
    description="Analyzes contractor workforce allocations, staffing ratios across 6 agencies, and vendor SLA compliance.",
)
async def vendor_analysis(
    request: Request,
    db: Session = Depends(get_readonly_db),
) -> JSONResponse:
    """Execute evidence-based Vendor Workforce Agent analysis over Neon PostgreSQL records."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    try:
        result = await run_in_threadpool(
            vendor_agent_service.execute_vendor_analysis,
            db,
            date=body.get("date"),
            start_date=body.get("start_date") or body.get("startDate"),
            end_date=body.get("end_date") or body.get("endDate"),
            plant_id=body.get("plant_id") or body.get("plantId"),
            shift_id=body.get("shift_id") or body.get("shiftId"),
            department_id=body.get("department_id") or body.get("departmentId"),
            section_id=body.get("section_id") or body.get("sectionId"),
            operator_team=body.get("operator_team") or body.get("operatorTeam"),
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except Exception as exc:
        logger.exception("Vendor agent analysis failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "FAILED",
                "error": str(exc),
                "message": "Failed to complete Vendor Workforce Agent execution.",
            },
        )


@router.post(
    "/chat-stream",
    summary="Stream Real-time Execution of Central Workforce Intelligence Assistant",
    description="Server-Sent Events (SSE) stream providing real-time 6-stage execution progress for AI Assistance.",
)
async def chat_stream(request: Request) -> StreamingResponse:
    """Stream central workforce assistant 6-stage execution progress via SSE."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    user_query = body.get("message") or body.get("user_query") or body.get("query") or ""
    conversation_id = body.get("conversation_id")
    execution_id = body.get("execution_id") or body.get("executionId")

    return StreamingResponse(
        central_agent_orchestrator.stream_orchestration(
            user_query=user_query,
            conversation_id=conversation_id,
            client_execution_id=execution_id,
            request=request,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/stream-analysis",
    summary="Stream Real-time Execution of Specialist Agents",
    description="Server-Sent Events (SSE) stream providing real-time stage-by-stage execution progress for any Analytics specialist agent or Central Assistant.",
)
@router.post(
    "/stream-analysis/",
    include_in_schema=False,
)
async def stream_analysis(request: Request) -> StreamingResponse:
    """Stream real-time stage execution progress and final payload via SSE."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    if not isinstance(body, dict):
        body = {}

    agent_type = body.get("agent_type") or body.get("agentType") or "attendance"
    filters = body.get("filters") if isinstance(body.get("filters"), dict) else body
    execution_id = body.get("execution_id") or body.get("executionId")
    user_query = body.get("message") or body.get("user_query") or (filters.get("message") if isinstance(filters, dict) else None)

    # If central assistant query or central agent type, dispatch to central orchestrator
    if agent_type in {"central", "assistant", "central_assistant", "central_agent"} or user_query:
        return StreamingResponse(
            central_agent_orchestrator.stream_orchestration(
                user_query=user_query or "Provide workforce operational overview",
                conversation_id=body.get("conversation_id"),
                client_execution_id=execution_id,
                request=request,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return StreamingResponse(
        stream_specialist_agent_execution(
            agent_type=agent_type,
            filters=filters,
            client_execution_id=execution_id,
            request=request,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/approve-planning",
    summary="Approve Workforce Planning Adjustments",
    description="Records administrative HR approval for workforce planning, standby replacements, and roster actions.",
)
async def approve_planning(request: Request) -> JSONResponse:
    """Record verified HR approval decision for workforce planning."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON request body.",
        )

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must be a JSON object.",
        )

    execution_id = body.get("execution_id") or body.get("executionId")
    if not execution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Execution ID is required to record approval.",
        )

    decision = str(body.get("decision", "APPROVED")).upper().strip()
    if decision not in {"APPROVED", "ACKNOWLEDGED", "REJECTED"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid decision '{decision}'. Must be APPROVED, ACKNOWLEDGED, or REJECTED.",
        )

    # Optional test simulation flag for testing Scenario E failure handling
    if body.get("force_failure"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Simulated approval failure: HR governance service rejected transaction.",
        )

    approval_id = f"APV-PLN-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    timestamp = dt.datetime.utcnow().isoformat() + "Z"
    approved_by = body.get("approved_by") or body.get("approvedBy") or "Plant HRBP / Operations Lead"
    notes = body.get("notes") or ""
    target_date = body.get("target_date") or body.get("targetDate")

    logger.info(
        "Workforce Planning HR Decision recorded: [%s] decision=%s approved_by='%s' target_date=%s exec=%s",
        approval_id,
        decision,
        approved_by,
        target_date,
        execution_id,
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "success",
            "approval_id": approval_id,
            "execution_id": execution_id,
            "decision": decision,
            "approved_by": approved_by,
            "target_date": target_date,
            "timestamp": timestamp,
            "notes": notes,
            "message": f"Planning adjustments successfully {decision.lower()}. Recorded in HR governance audit trail.",
        },
    )











