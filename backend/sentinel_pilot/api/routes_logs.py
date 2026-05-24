from typing import Any

from fastapi import APIRouter, Query, Request

from sentinel_pilot.services.log_service import SecurityLogService

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/security")
def search_security_logs(
    request: Request,
    alert_id: str | None = None,
    host: str | None = None,
    username: str | None = None,
    src_ip: str | None = None,
    event_type: str | None = None,
    severity: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    service: SecurityLogService = request.app.state.security_log_service
    return service.search(
        alert_id=alert_id,
        host=host,
        username=username,
        src_ip=src_ip,
        event_type=event_type,
        severity=severity,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )
