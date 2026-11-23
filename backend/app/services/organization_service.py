"""Service layer for departments and sections."""

from sqlalchemy.orm import Session

from app.repositories import organization_repository
from app.schemas.organization import (
    DepartmentItem,
    DepartmentListResponse,
    SectionItem,
    SectionListResponse,
)
from app.utils.query_helpers import build_pagination_meta


def list_departments(
    db: Session,
    *,
    plant_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> DepartmentListResponse:
    available, rows, total = organization_repository.list_departments(
        db, plant_id=plant_id, search=search, limit=limit, offset=offset
    )
    items = [DepartmentItem(**r) for r in rows]
    return DepartmentListResponse(
        dataset_available=available,
        items=items,
        pagination=build_pagination_meta(
            total=total, limit=limit, offset=offset, returned=len(items)
        ),
    )


def list_sections(
    db: Session,
    *,
    department_id: str | None = None,
    plant_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> SectionListResponse:
    available, rows, total = organization_repository.list_sections(
        db,
        department_id=department_id,
        plant_id=plant_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    items = [SectionItem(**r) for r in rows]
    return SectionListResponse(
        dataset_available=available,
        items=items,
        pagination=build_pagination_meta(
            total=total, limit=limit, offset=offset, returned=len(items)
        ),
    )

