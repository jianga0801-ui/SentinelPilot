from typing import Any

from sentinel_pilot.adapters.base import SecurityDeviceAdapter
from sentinel_pilot.agent.tools import write_report
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Approval, Investigation, Report, TimelineItem
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)


class ReportService:
    def __init__(
        self,
        alert_source: SecurityDeviceAdapter,
        investigations: InvestigationRepository,
        approvals: ApprovalRepository,
        reports: ReportRepository,
        timeline: TimelineRepository,
        im_notifier: IMNotifier | None = None,
    ) -> None:
        self.alert_source = alert_source
        self.investigations = investigations
        self.approvals = approvals
        self.reports = reports
        self.timeline = timeline
        self.im_notifier = im_notifier

    def get_or_create(self, investigation_id: str) -> Report:
        investigation = self.investigations.get(investigation_id)
        if investigation is None:
            raise SentinelPilotError(
                code="not_found",
                message=f"Investigation not found: {investigation_id}",
                status_code=404,
            )

        existing = self.reports.get_by_investigation(investigation_id)
        if existing is not None:
            return existing

        content = self._build_markdown(investigation)
        report = write_report(
            investigation_id=investigation_id,
            content=content,
            reports=self.reports,
            timeline=self.timeline,
        )
        if self.im_notifier is not None:
            self.im_notifier.send_investigation_completed(report)
        return report

    def _build_markdown(self, investigation: Investigation) -> str:
        alert = self.alert_source.get_alert(investigation.alert_id)
        timeline_items = self.timeline.list_by_investigation(investigation.id)
        approvals = self.approvals.list_by_investigation(investigation.id)
        evidence_ids = _evidence_ids(timeline_items)
        approval_summary = _approval_summary(approvals)

        return "\n\n".join(
            [
                "# Security Incident Report",
                "## 1. Executive Summary\n"
                f"{investigation.summary or 'Investigation completed with local evidence.'}",
                "## 2. Alert Details\n"
                f"- Alert ID: {alert.id}\n"
                f"- Title: {alert.title}\n"
                f"- Source: {alert.source}\n"
                f"- Severity: {investigation.severity}\n"
                f"- Category: {investigation.category}",
                "## 3. Investigation Steps\n" + _timeline_summary(timeline_items),
                "## 4. Evidence Chain\n" + _evidence_summary(evidence_ids),
                "## 5. MITRE ATT&CK Mapping\n"
                + _list_or_none(investigation.mitre_techniques),
                "## 6. Impact Assessment\n"
                f"Severity is assessed as {investigation.severity} based on normalized evidence.",
                "## 7. Response Recommendations\n"
                "Review response actions in approval records before simulated execution.",
                "## 8. Approval History\n" + approval_summary,
                "## 9. Hardening Recommendations\n"
                "- Review affected accounts, hosts, and network controls.\n"
                "- Tune detections with confirmed evidence from this investigation.\n"
                "- Keep all response actions simulated until enterprise integration is approved.",
            ]
        )


def _timeline_summary(items: list[TimelineItem]) -> str:
    if not items:
        return "- No timeline events recorded."
    return "\n".join(f"- {item.type}: {item.title}" for item in items)


def _evidence_summary(evidence_ids: list[str]) -> str:
    if not evidence_ids:
        return "- No explicit evidence IDs were captured."
    return "\n".join(f"- {evidence_id}" for evidence_id in evidence_ids)


def _approval_summary(approvals: list[Approval]) -> str:
    if not approvals:
        return "- No approval records were required."
    return "\n".join(
        f"- {approval.action_type} {approval.target}: {approval.status}"
        for approval in approvals
    )


def _list_or_none(values: list[str]) -> str:
    if not values:
        return "- No confident MITRE mapping."
    return "\n".join(f"- {value}" for value in values)


def _evidence_ids(items: list[TimelineItem]) -> list[str]:
    evidence: list[str] = []
    for item in items:
        _collect_ids(item.input, evidence)
        _collect_ids(item.output, evidence)
    return sorted(set(evidence))


def _collect_ids(value: Any, evidence: list[str]) -> None:
    if isinstance(value, dict):
        if isinstance(value.get("id"), str) and value["id"].startswith("evt_"):
            evidence.append(value["id"])
        for nested in value.values():
            _collect_ids(nested, evidence)
    elif isinstance(value, list):
        for nested in value:
            _collect_ids(nested, evidence)
