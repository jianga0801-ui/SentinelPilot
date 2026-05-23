import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.config import settings
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Alert, Report
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_LOGS_PATH = PROJECT_ROOT / "examples" / "logs" / "events.jsonl"
DEFAULT_THREAT_INTEL_PATH = PROJECT_ROOT / "examples" / "threat_intel" / "indicators.json"
DEFAULT_KNOWLEDGE_BASE_ROOT = PROJECT_ROOT / "knowledge_base"

IndicatorType = Literal["ip", "domain", "hash"]
Reputation = Literal["unknown", "benign", "suspicious", "malicious"]
Confidence = Literal["low", "medium", "high"]


class LogEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    alert_id: str
    event_time: datetime
    log_type: str
    host: str | None = None
    message: str


class ThreatIntelResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    indicator: str
    indicator_type: IndicatorType
    reputation: Reputation
    labels: list[str] = Field(default_factory=list)
    source: str
    matched_at: datetime


class KnowledgeDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    path: str
    snippet: str
    score: int


class Evidence(BaseModel):
    model_config = ConfigDict(extra="allow")

    source: str
    content: str


class MitreTechnique(BaseModel):
    model_config = ConfigDict(extra="forbid")

    technique_id: str
    name: str
    tactic: str
    confidence: Confidence
    reason: str


def _utc_now() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def _parse_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _project_relative(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def get_alert(alert_id: str, alert_source: MockAlertSource | None = None) -> Alert:
    source = alert_source or MockAlertSource()
    return source.get_alert(alert_id)


def search_logs(
    time_range: dict[str, datetime] | None = None,
    host: str | None = None,
    username: str | None = None,
    src_ip: str | None = None,
    log_type: str | None = None,
    logs_path: Path | None = None,
) -> list[LogEntry]:
    path = logs_path or DEFAULT_LOGS_PATH
    if not path.exists():
        return []

    start = _parse_datetime(time_range["start"]) if time_range else None
    end = _parse_datetime(time_range["end"]) if time_range else None
    matches: list[LogEntry] = []

    with path.open(encoding="utf-8") as file:
        for line in file:
            event = LogEntry.model_validate(json.loads(line))
            event_time = _parse_datetime(event.event_time)
            if start is not None and event_time < start:
                continue
            if end is not None and event_time > end:
                continue
            if host is not None and event.host != host:
                continue
            if username is not None and getattr(event, "username", None) != username:
                continue
            if src_ip is not None and getattr(event, "src_ip", None) != src_ip:
                continue
            if log_type is not None and event.log_type != log_type:
                continue
            matches.append(event)

    return sorted(matches, key=lambda event: event.event_time)


def lookup_threat_intel(
    indicator: str,
    indicator_type: IndicatorType,
    matched_at: datetime | None = None,
    intel_path: Path | None = None,
) -> ThreatIntelResult:
    path = intel_path or DEFAULT_THREAT_INTEL_PATH
    records = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    matched_time = matched_at or _utc_now()

    for record in records:
        if record.get("indicator") == indicator and record.get("indicator_type") == indicator_type:
            return ThreatIntelResult(
                indicator=indicator,
                indicator_type=indicator_type,
                reputation=record["reputation"],
                labels=record.get("labels", []),
                source=record.get("source", "local-sample"),
                matched_at=matched_time,
            )

    return ThreatIntelResult(
        indicator=indicator,
        indicator_type=indicator_type,
        reputation="unknown",
        labels=[],
        source="local-sample",
        matched_at=matched_time,
    )


def search_knowledge_base(
    query: str,
    limit: int = 5,
    knowledge_base_root: Path | None = None,
) -> list[KnowledgeDocument]:
    root = knowledge_base_root or DEFAULT_KNOWLEDGE_BASE_ROOT
    terms = [term for term in re.findall(r"[a-zA-Z0-9.]+", query.lower()) if term]
    if not root.exists() or limit <= 0 or not terms:
        return []

    documents: list[KnowledgeDocument] = []
    for path in sorted(root.rglob("*.md")):
        content = path.read_text(encoding="utf-8")
        title = _extract_title(content, path)
        haystack = f"{title}\n{content}".lower()
        score = sum(haystack.count(term) for term in terms)
        score += sum(title.lower().count(term) * 3 for term in terms)
        if path.relative_to(root).parts[0] == "playbooks":
            score += 5
        if score == 0:
            continue
        documents.append(
            KnowledgeDocument(
                id=path.relative_to(root).as_posix(),
                title=title,
                path=_project_relative(path),
                snippet=_extract_snippet(content, terms),
                score=score,
            )
        )

    return sorted(documents, key=lambda document: (-document.score, document.id))[:limit]


def map_mitre_attack(
    category: str,
    evidence: list[Evidence | dict[str, Any]],
) -> list[MitreTechnique]:
    normalized_evidence = [
        item if isinstance(item, Evidence) else Evidence.model_validate(item) for item in evidence
    ]
    category_text = category.lower()
    evidence_text = " ".join(item.content for item in normalized_evidence).lower()
    techniques: list[MitreTechnique] = []

    if "auth" in category_text and (
        "brute force" in evidence_text
        or "failed password" in evidence_text
        or "password spraying" in evidence_text
    ):
        techniques.append(
            MitreTechnique(
                technique_id="T1110",
                name="Brute Force",
                tactic="Credential Access",
                confidence="high",
                reason="Authentication evidence shows repeated failed password attempts.",
            )
        )

    if (
        ("powershell" in category_text or "execution" in category_text)
        and (
            "powershell" in evidence_text
            or "encoded command" in evidence_text
            or "event id 4104" in evidence_text
        )
    ):
        techniques.append(
            MitreTechnique(
                technique_id="T1059.001",
                name="Command and Scripting Interpreter: PowerShell",
                tactic="Execution",
                confidence="high",
                reason="Process evidence shows suspicious PowerShell script execution.",
            )
        )

    if (
        "webshell" in evidence_text
        or "web shell" in evidence_text
        or "avatar.aspx" in evidence_text
    ):
        techniques.append(
            MitreTechnique(
                technique_id="T1505.003",
                name="Server Software Component: Web Shell",
                tactic="Persistence",
                confidence="high",
                reason="Web evidence indicates an uploaded script used as a web shell.",
            )
        )

    if (
        ("network" in category_text or "malicious" in category_text or "command" in category_text)
        and "dns query" in evidence_text
        and ("beacon" in evidence_text or "malicious domain" in evidence_text)
    ):
        techniques.append(
            MitreTechnique(
                technique_id="T1071.001",
                name="Application Layer Protocol: Web Protocols",
                tactic="Command and Control",
                confidence="medium",
                reason=(
                    "DNS and HTTPS evidence is associated with beacon-like web protocol activity."
                ),
            )
        )

    if (
        "lateral" in category_text
        or "remote wmi" in evidence_text
        or "smb share" in evidence_text
    ):
        if "smb share" in evidence_text:
            techniques.append(
                MitreTechnique(
                    technique_id="T1021.002",
                    name="SMB/Windows Admin Shares",
                    tactic="Lateral Movement",
                    confidence="medium",
                    reason="Evidence shows SMB share access during lateral movement.",
                )
            )
        if "remote wmi" in evidence_text or "winrm" in evidence_text:
            techniques.append(
                MitreTechnique(
                    technique_id="T1021.006",
                    name="Windows Remote Management",
                    tactic="Lateral Movement",
                    confidence="medium",
                    reason="Evidence shows Windows remote management activity across hosts.",
                )
            )

    return techniques


def write_report(
    investigation_id: str,
    content: str,
    reports: ReportRepository | None = None,
    timeline: TimelineRepository | None = None,
) -> Report:
    report_repo, timeline_repo = _resolve_report_dependencies(reports, timeline)
    _ensure_report_can_complete(report_repo, investigation_id)
    report = report_repo.create(investigation_id=investigation_id, content=content)
    _mark_investigation_completed(report_repo, investigation_id)

    if timeline_repo is not None:
        timeline_repo.add(
            investigation_id=investigation_id,
            type="report_created",
            title="Report created",
            content="Final Markdown report was written.",
            tool_name="write_report",
            input={"content_length": len(content)},
            output={"report_id": report.id, "format": report.format},
        )
    return report


def _extract_title(content: str, path: Path) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line.removeprefix("# ").strip()
    return path.stem.replace("-", " ").title()


def _extract_snippet(content: str, terms: list[str]) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if (
            stripped
            and not stripped.startswith("#")
            and any(term in stripped.lower() for term in terms)
        ):
            return stripped[:240]
    return content.strip().replace("\n", " ")[:240]


def _resolve_report_dependencies(
    reports: ReportRepository | None,
    timeline: TimelineRepository | None,
) -> tuple[ReportRepository, TimelineRepository | None]:
    if reports is not None:
        return reports, timeline

    connection = create_connection(settings.database_url)
    init_database(connection)
    return ReportRepository(connection), timeline or TimelineRepository(connection)


def _ensure_report_can_complete(reports: ReportRepository, investigation_id: str) -> None:
    investigation = InvestigationRepository(reports.connection).get(investigation_id)
    if investigation is None:
        raise SentinelPilotError(
            code="not_found",
            message=f"Investigation not found: {investigation_id}",
            status_code=404,
        )
    if investigation.status == "waiting_approval":
        raise SentinelPilotError(
            code="invalid_state",
            message="Investigation is waiting for approval and cannot be completed.",
            status_code=409,
        )


def _mark_investigation_completed(reports: ReportRepository, investigation_id: str) -> None:
    InvestigationRepository(reports.connection).update_status(investigation_id, "completed")
