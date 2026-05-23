from typing import Annotated

from fastapi import APIRouter, Depends

from sentinel_pilot.api.dependencies import get_report_service
from sentinel_pilot.core.models import Report
from sentinel_pilot.services.report_service import ReportService

router = APIRouter(prefix="/api/investigations", tags=["reports"])


@router.get("/{investigation_id}/report", response_model=Report)
def get_report(
    investigation_id: str,
    service: Annotated[ReportService, Depends(get_report_service)],
) -> Report:
    return service.get_or_create(investigation_id)
