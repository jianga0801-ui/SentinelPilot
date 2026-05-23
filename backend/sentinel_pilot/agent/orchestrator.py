from sentinel_pilot.agent.tool_registry import ToolRegistry
from sentinel_pilot.agent.tools import Evidence
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import ApprovalAction, Investigation, RiskLevel, Severity
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.llm.base import LLMAnalysis, LLMClient, LLMConstraints
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    TimelineRepository,
)


class InvestigationOrchestrator:
    def __init__(
        self,
        investigations: InvestigationRepository,
        timeline: TimelineRepository,
        approvals: ApprovalRepository | None = None,
        registry: ToolRegistry | None = None,
        im_notifier: IMNotifier | None = None,
        llm_client: LLMClient | None = None,
        llm_constraints: LLMConstraints | None = None,
    ) -> None:
        self.investigations = investigations
        self.timeline = timeline
        self.approvals = approvals or ApprovalRepository(investigations.connection)
        self.registry = registry or ToolRegistry.default(timeline=timeline)
        self.im_notifier = im_notifier
        self.llm_client = llm_client
        self.llm_constraints = llm_constraints or LLMConstraints()

    def run(self, investigation_id: str) -> Investigation:
        investigation = self.investigations.get(investigation_id)
        if investigation is None:
            raise SentinelPilotError(
                code="not_found",
                message=f"Investigation not found: {investigation_id}",
                status_code=404,
            )

        alert = self.registry.call(
            "get_alert",
            investigation_id=investigation_id,
            alert_id=investigation.alert_id,
        )
        logs = self.registry.call(
            "search_logs",
            investigation_id=investigation_id,
            time_range=alert.time_range.model_dump(),
            host=alert.entities.get("dst_host") or alert.entities.get("host"),
            username=self._log_username(alert.category, alert.entities),
            src_ip=alert.entities.get("src_ip"),
            log_type="auth" if alert.category == "authentication" else None,
        )
        threat_intel = None
        indicator, indicator_type = self._threat_indicator(alert.entities)
        if indicator is not None and indicator_type is not None:
            threat_intel = self.registry.call(
                "lookup_threat_intel",
                investigation_id=investigation_id,
                indicator=indicator,
                indicator_type=indicator_type,
            )

        evidence_text = self._build_evidence_text(logs)
        techniques = self.registry.call(
            "map_mitre_attack",
            investigation_id=investigation_id,
            category=alert.category,
            evidence=[Evidence(source="logs", content=evidence_text)],
        )
        self.registry.call(
            "search_knowledge_base",
            investigation_id=investigation_id,
            query=f"{alert.category} {evidence_text}",
            limit=3,
        )

        severity, category, summary = self._classify(
            alert.severity,
            alert.category,
            logs,
            threat_intel,
        )
        approval = self._approval_request(alert.category, alert.entities)
        llm_analysis = self._llm_analysis(
            investigation_id=investigation_id,
            alert=alert,
            logs=logs,
            threat_intel=threat_intel,
            evidence_text=evidence_text,
            fallback_summary=summary,
            fallback_severity=severity,
            fallback_category=category,
            fallback_mitre=[technique.technique_id for technique in techniques],
        )
        if llm_analysis is not None:
            severity = llm_analysis.severity
            category = llm_analysis.category
            summary = llm_analysis.summary
            if llm_analysis.mitre_techniques:
                techniques = [
                    type("TechniqueRef", (), {"technique_id": technique_id})()
                    for technique_id in llm_analysis.mitre_techniques
                ]
            approval = self._llm_approval_request(llm_analysis) or approval
        status = "completed"
        if approval is not None:
            action_type, target, risk_level, reason = approval
            created_approval = self._ensure_approval(
                investigation_id=investigation_id,
                action_type=action_type,
                target=target,
                risk_level=risk_level,
                reason=reason,
            )
            if created_approval.status == "pending":
                self.timeline.add(
                    investigation_id=investigation_id,
                    type="approval_created",
                    title="Approval required",
                    content=reason,
                    input={"action_type": action_type, "target": target, "risk_level": risk_level},
                    output={"approval_id": created_approval.id, "status": created_approval.status},
                )
                if self.im_notifier is not None:
                    self.im_notifier.send_approval_required(created_approval)
                if self.llm_constraints.action_mode == "auto_approve_simulated":
                    self._auto_approve_simulated(created_approval.id)
                else:
                    status = "waiting_approval"
        return self.investigations.update_analysis(
            investigation_id=investigation_id,
            status=status,
            summary=summary,
            severity=severity,
            category=category,
            mitre_techniques=[technique.technique_id for technique in techniques],
        )

    def _llm_analysis(
        self,
        investigation_id: str,
        alert,
        logs: list,
        threat_intel: object | None,
        evidence_text: str,
        fallback_summary: str,
        fallback_severity: Severity,
        fallback_category: str,
        fallback_mitre: list[str],
    ) -> LLMAnalysis | None:
        if self.llm_client is None:
            return None
        context = {
            "alert": alert.model_dump(mode="json"),
            "logs": [
                log.model_dump(mode="json") if hasattr(log, "model_dump") else str(log)
                for log in logs
            ],
            "threat_intel": (
                threat_intel.model_dump(mode="json")
                if hasattr(threat_intel, "model_dump")
                else threat_intel
            ),
            "evidence_text": evidence_text,
            "fallback_analysis": {
                "summary": fallback_summary,
                "severity": fallback_severity,
                "category": fallback_category,
                "mitre_techniques": fallback_mitre,
            },
            "constraints": self.llm_constraints.as_status(),
        }
        analysis = self.llm_constraints.apply(self.llm_client.analyze(context))
        self.timeline.add(
            investigation_id=investigation_id,
            type="agent_message",
            title="LLM analysis",
            content=analysis.summary,
            input={"provider_context": "normalized_evidence"},
            output={
                "severity": analysis.severity,
                "category": analysis.category,
                "mitre_techniques": analysis.mitre_techniques,
                "confidence": analysis.confidence,
                "recommended_actions": [
                    action.model_dump(mode="json") for action in analysis.recommended_actions
                ],
            },
        )
        return analysis

    def _llm_approval_request(
        self,
        analysis: LLMAnalysis,
    ) -> tuple[ApprovalAction, str, RiskLevel, str] | None:
        if self.llm_constraints.action_mode == "recommend_only":
            return None
        if not analysis.recommended_actions:
            return None
        action = analysis.recommended_actions[0]
        return (
            action.action_type,  # type: ignore[return-value]
            action.target,
            action.risk_level,
            action.reason,
        )

    def _auto_approve_simulated(self, approval_id: str) -> None:
        approval = self.approvals.update_decision(
            approval_id,
            "approved",
            "Auto-approved by LLM policy in simulated response mode.",
        )
        self.timeline.add(
            investigation_id=approval.investigation_id,
            type="approval_decision",
            title="Simulated auto-approval recorded",
            content=f"Approval {approval.id} was auto-approved by LLM policy.",
            input={"approval_id": approval.id, "decision": "approved"},
            output={"status": approval.status, "simulated": True},
        )

    def _classify(
        self,
        alert_severity: Severity,
        alert_category: str,
        logs: list,
        threat_intel: object | None,
    ) -> tuple[Severity, str, str]:
        has_successful_login = any(
            getattr(log, "success", False) is True or "accepted password" in log.message.lower()
            for log in logs
        )
        reputation = getattr(threat_intel, "reputation", "unknown")

        if (
            alert_category == "authentication"
            and reputation == "suspicious"
            and has_successful_login
        ):
            return (
                "high",
                "credential_access",
                "SSH brute force source has suspicious threat intelligence and a successful login "
                "was observed after repeated failed attempts.",
            )

        if alert_category == "suspicious_powershell":
            return (
                "high",
                "execution",
                "Suspicious PowerShell execution was confirmed with local process evidence.",
            )

        if alert_category == "malicious_domain":
            return (
                "medium",
                "command_and_control",
                "Domain and network evidence indicate command and control behavior.",
            )

        if alert_category == "web_intrusion":
            return (
                "high",
                "web_intrusion",
                "Web intrusion evidence indicates a likely webshell upload or execution path.",
            )

        if alert_category == "lateral_movement":
            return (
                "high",
                "lateral_movement",
                "Lateral movement evidence shows remote access patterns across hosts.",
            )

        if alert_category == "false_positive":
            return (
                "low",
                "false_positive",
                "Known scanner activity indicates a low-risk false positive.",
            )

        return (
            alert_severity,
            alert_category,
            "Investigation completed using local evidence without severity promotion.",
        )

    def _build_evidence_text(self, logs: list) -> str:
        evidence_parts: list[str] = []
        for log in logs:
            evidence_parts.append(log.message)
            if getattr(log, "event_id", None) == 4624 and getattr(log, "logon_type", None) == 3:
                evidence_parts.append("Network logon (Event 4624 logon_type 3).")
            if getattr(log, "event_id", None) == 4624 and getattr(log, "logon_type", None) == 10:
                evidence_parts.append("Remote interactive logon (Event 4624 logon_type 10).")
            if getattr(log, "share", None) is not None or "smb" in log.message.lower():
                evidence_parts.append("SMB share access pattern detected.")
            if getattr(log, "protocol", None) == "WMI" or "remote wmi" in log.message.lower():
                evidence_parts.append("Remote WMI connection pattern detected.")
        return " ".join(evidence_parts)

    def _log_username(self, category: str, entities: dict) -> str | None:
        if category in ("authentication", "lateral_movement"):
            return entities.get("username")
        return None

    def _threat_indicator(self, entities: dict) -> tuple[str | None, str | None]:
        if entities.get("src_ip"):
            return entities["src_ip"], "ip"
        if entities.get("domain"):
            return entities["domain"], "domain"
        if entities.get("dst_ip"):
            return entities["dst_ip"], "ip"
        return None, None

    def _approval_request(
        self,
        category: str,
        entities: dict,
    ) -> tuple[ApprovalAction, str, RiskLevel, str] | None:
        if category == "authentication" and entities.get("src_ip"):
            return (
                "block_ip",
                entities["src_ip"],
                "high",
                "Suspicious source IP generated repeated failed logins and successful access.",
            )
        if category == "suspicious_powershell" and entities.get("host"):
            return (
                "isolate_host",
                entities["host"],
                "high",
                "Suspicious PowerShell execution with network activity requires host isolation.",
            )
        if category == "lateral_movement" and entities.get("src_host"):
            return (
                "isolate_host",
                entities["src_host"],
                "high",
                "Lateral movement source host requires isolation approval.",
            )
        return None

    def _ensure_approval(
        self,
        investigation_id: str,
        action_type: ApprovalAction,
        target: str,
        risk_level: RiskLevel,
        reason: str,
    ):
        for approval in self.approvals.list_by_investigation(investigation_id):
            if approval.action_type == action_type and approval.target == target:
                return approval
        return self.approvals.create(
            investigation_id=investigation_id,
            action_type=action_type,
            target=target,
            risk_level=risk_level,
            reason=reason,
        )
