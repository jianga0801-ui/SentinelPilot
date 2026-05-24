from typing import Any

from fastapi import APIRouter, Query, Request

from sentinel_pilot.llm.factory import get_llm_status
from sentinel_pilot.services.log_service import ServiceLogService

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health")
def system_health(request: Request) -> dict[str, Any]:
    im_status = request.app.state.im_notifier.get_status()
    llm_status = get_llm_status(request.app.state.runtime_settings)
    return {
        "backend": {"status": "online"},
        "database": {"status": _database_status(request)},
        "llm": {
            "status": "online" if llm_status["enabled"] else "disabled",
            "configured": llm_status["api_key_configured"] or llm_status["provider"] == "mock",
        },
        "im": {
            "status": "online" if im_status.get("enabled") else "disabled",
            "configured": bool(im_status.get("enabled")),
        },
    }


@router.get("/dashboard")
def dashboard(request: Request) -> dict[str, Any]:
    connection = request.app.state.database_connection
    alerts = request.app.state.alert_source.list_alerts()
    investigation_status = _count_by_status(connection, "investigations")
    approval_status = _count_by_status(connection, "approvals")
    recent_timeline = connection.execute(
        """
        SELECT id, investigation_id, type, title, content, created_at
        FROM timeline_items
        ORDER BY created_at DESC, id DESC
        LIMIT 8
        """
    ).fetchall()
    critical_alerts = [alert for alert in alerts if alert.severity in ("critical", "high")]

    return {
        "health": system_health(request),
        "metrics": {
            "total_alerts": len(alerts),
            "today_alerts": len(alerts),
            "high_risk_alerts": len(critical_alerts),
            "investigations_total": sum(investigation_status.values()),
            "investigations_running": investigation_status.get("running", 0),
            "investigations_waiting_approval": investigation_status.get("waiting_approval", 0),
            "investigations_completed": investigation_status.get("completed", 0),
            "pending_approvals": approval_status.get("pending", 0),
        },
        "recent_timeline": [dict(row) for row in recent_timeline],
        "recent_high_risk_alerts": [
            {
                "id": alert.id,
                "title": alert.title,
                "severity": alert.severity,
                "category": alert.category,
                "created_at": alert.created_at,
            }
            for alert in critical_alerts[:5]
        ],
    }


@router.get("/logs/service")
def service_logs(
    request: Request,
    level: str | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    service: ServiceLogService = request.app.state.service_log_service
    return service.list_recent(level=level, q=q, limit=limit)


def _database_status(request: Request) -> str:
    try:
        request.app.state.database_connection.execute("SELECT 1").fetchone()
    except Exception:
        return "offline"
    return "online"


def _count_by_status(connection: Any, table: str) -> dict[str, int]:
    rows = connection.execute(
        f"SELECT status, COUNT(*) AS count FROM {table} GROUP BY status"
    ).fetchall()
    return {row["status"]: row["count"] for row in rows}
