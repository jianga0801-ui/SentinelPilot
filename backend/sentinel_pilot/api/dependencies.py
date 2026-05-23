from fastapi import Request

from sentinel_pilot.adapters.base import SecurityDeviceAdapter
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.services.approval_service import ApprovalService
from sentinel_pilot.services.investigation_service import InvestigationService
from sentinel_pilot.services.report_service import ReportService


def get_alert_source(request: Request) -> SecurityDeviceAdapter:
    return request.app.state.alert_source


def get_investigation_service(request: Request) -> InvestigationService:
    return request.app.state.investigation_service


def get_approval_service(request: Request) -> ApprovalService:
    return request.app.state.approval_service


def get_report_service(request: Request) -> ReportService:
    return request.app.state.report_service


def get_im_notifier(request: Request) -> IMNotifier:
    return request.app.state.im_notifier
