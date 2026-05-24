from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.api.routes_alerts import router as alerts_router
from sentinel_pilot.api.routes_approvals import router as approvals_router
from sentinel_pilot.api.routes_evals import router as evals_router
from sentinel_pilot.api.routes_integrations import router as integrations_router
from sentinel_pilot.api.routes_investigations import router as investigations_router
from sentinel_pilot.api.routes_llm import router as llm_router
from sentinel_pilot.api.routes_logs import router as logs_router
from sentinel_pilot.api.routes_reports import router as reports_router
from sentinel_pilot.api.routes_settings import router as settings_router
from sentinel_pilot.api.routes_system import router as system_router
from sentinel_pilot.api.schemas import ErrorResponse
from sentinel_pilot.config import settings
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.desktop_runtime import resolve_runtime_paths
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.llm.factory import constraints_from_settings, create_llm_client
from sentinel_pilot.services.approval_service import ApprovalService
from sentinel_pilot.services.investigation_service import InvestigationService
from sentinel_pilot.services.log_service import SecurityLogService, ServiceLogService
from sentinel_pilot.services.report_service import ReportService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    SystemConfigRepository,
    TimelineRepository,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    runtime_paths = resolve_runtime_paths(settings)
    connection = create_connection(runtime_paths.database_url)
    init_database(connection)
    alert_source = MockAlertSource()
    app.state.runtime_paths = runtime_paths
    app.state.database_connection = connection
    app.state.alert_source = alert_source
    app.state.eval_runs = {}
    app.state.system_config = SystemConfigRepository(connection)
    app.state.security_log_service = SecurityLogService()
    app.state.service_log_service = ServiceLogService(runtime_paths.service_log_path)
    app.state.runtime_settings = settings
    app.state.im_notifier = IMNotifier(settings)
    app.state.llm_client = create_llm_client(settings) if settings.llm_enabled else None
    app.state.llm_constraints = constraints_from_settings(settings)
    app.state.investigation_service = InvestigationService(
        alert_source=alert_source,
        investigations=InvestigationRepository(connection),
        timeline=TimelineRepository(connection),
        approvals=ApprovalRepository(connection),
        im_notifier=app.state.im_notifier,
        llm_client=app.state.llm_client,
        llm_constraints=app.state.llm_constraints,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_allow_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(alerts_router)
app.include_router(investigations_router)
app.include_router(approvals_router)
app.include_router(reports_router)
app.include_router(evals_router)
app.include_router(integrations_router)
app.include_router(llm_router)
app.include_router(settings_router)
app.include_router(logs_router)
app.include_router(system_router)


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
