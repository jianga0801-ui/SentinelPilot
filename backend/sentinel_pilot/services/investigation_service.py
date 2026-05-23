from sentinel_pilot.adapters.base import SecurityDeviceAdapter
from sentinel_pilot.agent.orchestrator import InvestigationOrchestrator
from sentinel_pilot.agent.tool_registry import ToolRegistry
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Investigation, TimelineItem
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    TimelineRepository,
)


class InvestigationService:
    def __init__(
        self,
        alert_source: SecurityDeviceAdapter,
        investigations: InvestigationRepository,
        timeline: TimelineRepository,
        registry: ToolRegistry | None = None,
        approvals: ApprovalRepository | None = None,
        im_notifier: IMNotifier | None = None,
    ) -> None:
        self.alert_source = alert_source
        self.investigations = investigations
        self.timeline = timeline
        self.registry = registry
        self.approvals = approvals
        self.im_notifier = im_notifier

    def create(self, alert_id: str) -> Investigation:
        alert = self.alert_source.get_alert(alert_id)
        return self.investigations.create(
            alert_id=alert.id,
            severity=alert.severity,
            category=alert.category,
        )

    def get(self, investigation_id: str) -> Investigation:
        investigation = self.investigations.get(investigation_id)
        if investigation is None:
            raise SentinelPilotError(
                code="not_found",
                message=f"Investigation not found: {investigation_id}",
                status_code=404,
            )
        return investigation

    def list_timeline(self, investigation_id: str) -> list[TimelineItem]:
        self.get(investigation_id)
        return self.timeline.list_by_investigation(investigation_id)

    def start_run(self, investigation_id: str) -> Investigation:
        investigation = self.get(investigation_id)
        if investigation.status not in ("created", "running"):
            raise SentinelPilotError(
                code="invalid_state",
                message=f"Investigation cannot be run from status: {investigation.status}",
                status_code=409,
            )
        return self.investigations.update_status(investigation_id, "running")

    def run(self, investigation_id: str) -> Investigation:
        try:
            return InvestigationOrchestrator(
                investigations=self.investigations,
                timeline=self.timeline,
                registry=self.registry,
                approvals=self.approvals,
                im_notifier=self.im_notifier,
            ).run(investigation_id)
        except Exception:
            return self.investigations.mark_failed(
                investigation_id,
                "Investigation failed during deterministic orchestration.",
            )
