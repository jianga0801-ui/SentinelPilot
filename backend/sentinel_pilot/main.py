from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.api.routes_alerts import router as alerts_router
from sentinel_pilot.api.routes_approvals import router as approvals_router
from sentinel_pilot.api.routes_evals import router as evals_router
from sentinel_pilot.api.routes_integrations import router as integrations_router
from sentinel_pilot.api.routes_investigations import router as investigations_router
from sentinel_pilot.api.routes_reports import router as reports_router
from sentinel_pilot.api.schemas import ErrorResponse
from sentinel_pilot.config import settings
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.services.approval_service import ApprovalService
from sentinel_pilot.services.investigation_service import InvestigationService
from sentinel_pilot.services.report_service import ReportService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    connection = create_connection(settings.database_url)
    init_database(connection)
    alert_source = MockAlertSource()
    app.state.database_connection = connection
    app.state.alert_source = alert_source
    app.state.eval_runs = {}
    app.state.im_notifier = IMNotifier(settings)
    app.state.investigation_service = InvestigationService(
        alert_source=alert_source,
        investigations=InvestigationRepository(connection),
        timeline=TimelineRepository(connection),
        approvals=ApprovalRepository(connection),
        im_notifier=app.state.im_notifier,
    )
    app.state.approval_service = ApprovalService(
        investigations=InvestigationRepository(connection),
        approvals=ApprovalRepository(connection),
        timeline=TimelineRepository(connection),
    )
    app.state.report_service = ReportService(
        alert_source=alert_source,
        investigations=InvestigationRepository(connection),
        approvals=ApprovalRepository(connection),
        reports=ReportRepository(connection),
        timeline=TimelineRepository(connection),
        im_notifier=app.state.im_notifier,
    )
    try:
        yield
    finally:
        connection.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(alerts_router)
app.include_router(investigations_router)
app.include_router(approvals_router)
app.include_router(reports_router)
app.include_router(evals_router)
app.include_router(integrations_router)


@app.exception_handler(SentinelPilotError)
def handle_sentinel_pilot_error(
    _request: Request,
    exc: SentinelPilotError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error={"code": exc.code, "message": exc.message}).model_dump(),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
