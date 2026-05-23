from typing import Literal

from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Approval
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    TimelineRepository,
)


class ApprovalService:
    def __init__(
        self,
        investigations: InvestigationRepository,
        approvals: ApprovalRepository,
        timeline: TimelineRepository,
    ) -> None:
        self.investigations = investigations
        self.approvals = approvals
        self.timeline = timeline

    def list_by_investigation(self, investigation_id: str) -> list[Approval]:
        investigation = self.investigations.get(investigation_id)
        if investigation is None:
            raise SentinelPilotError(
                code="not_found",
                message=f"Investigation not found: {investigation_id}",
                status_code=404,
            )
        return self.approvals.list_by_investigation(investigation_id)

    def decide(
        self,
        approval_id: str,
        decision: Literal["approved", "rejected"],
        comment: str | None,
    ) -> Approval:
        approval = self.approvals.get(approval_id)
        if approval is None:
            raise SentinelPilotError(
                code="not_found",
                message=f"Approval not found: {approval_id}",
                status_code=404,
            )
        if approval.status != "pending":
            return approval

        decided = self.approvals.update_decision(approval_id, decision, comment)
        self.timeline.add(
            investigation_id=decided.investigation_id,
            type="approval_decision",
            title="Approval decision recorded",
            content=f"Approval {decided.id} was {decision}.",
            input={"approval_id": decided.id, "decision": decision, "comment": comment},
            output={"status": decided.status},
        )
        if not self._has_pending_approvals(decided.investigation_id):
            self.investigations.update_status(decided.investigation_id, "running")
        return decided

    def _has_pending_approvals(self, investigation_id: str) -> bool:
        return any(
            approval.status == "pending"
            for approval in self.approvals.list_by_investigation(investigation_id)
        )
