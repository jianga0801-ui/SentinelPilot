from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends

from sentinel_pilot.api.dependencies import get_investigation_service
from sentinel_pilot.api.schemas import (
    InvestigationCreateRequest,
    InvestigationCreateResponse,
    InvestigationRunResponse,
    TimelineResponse,
)
from sentinel_pilot.core.models import Investigation
from sentinel_pilot.services.investigation_service import InvestigationService

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.post("", response_model=InvestigationCreateResponse)
def create_investigation(
    request: InvestigationCreateRequest,
    service: Annotated[InvestigationService, Depends(get_investigation_service)],
) -> InvestigationCreateResponse:
    investigation = service.create(request.alert_id)
    return InvestigationCreateResponse(
        id=investigation.id,
        alert_id=investigation.alert_id,
        status=investigation.status,
        created_at=investigation.created_at,
    )


@router.post("/{investigation_id}/run", response_model=InvestigationRunResponse)
def run_investigation(
    investigation_id: str,
    background_tasks: BackgroundTasks,
    service: Annotated[InvestigationService, Depends(get_investigation_service)],
) -> InvestigationRunResponse:
    investigation = service.start_run(investigation_id)
    background_tasks.add_task(service.run, investigation_id)
    return InvestigationRunResponse(id=investigation.id, status=investigation.status)


@router.get("/{investigation_id}", response_model=Investigation)
def get_investigation(
    investigation_id: str,
    service: Annotated[InvestigationService, Depends(get_investigation_service)],
) -> Investigation:
    return service.get(investigation_id)


@router.get("/{investigation_id}/timeline", response_model=TimelineResponse)
def list_timeline(
    investigation_id: str,
    service: Annotated[InvestigationService, Depends(get_investigation_service)],
) -> TimelineResponse:
    return TimelineResponse(items=service.list_timeline(investigation_id))
