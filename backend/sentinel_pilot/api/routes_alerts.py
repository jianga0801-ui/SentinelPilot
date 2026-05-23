from typing import Annotated

from fastapi import APIRouter, Depends

from sentinel_pilot.adapters.base import SecurityDeviceAdapter
from sentinel_pilot.api.dependencies import get_alert_source
from sentinel_pilot.api.schemas import AlertListItem, AlertListResponse
from sentinel_pilot.core.models import Alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    source: Annotated[SecurityDeviceAdapter, Depends(get_alert_source)],
) -> AlertListResponse:
    return AlertListResponse(
        items=[
            AlertListItem(
                id=alert.id,
                title=alert.title,
                source=alert.source,
                vendor=alert.vendor,
                product=alert.product,
                device_type=alert.device_type,
                severity=alert.severity,
                category=alert.category,
                created_at=alert.created_at,
                status=alert.status,
            )
            for alert in source.list_alerts()
        ]
    )


@router.get("/{alert_id}", response_model=Alert)
def get_alert(
    alert_id: str,
    source: Annotated[SecurityDeviceAdapter, Depends(get_alert_source)],
) -> Alert:
    return source.get_alert(alert_id)
