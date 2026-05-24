import json
import sqlite3
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sentinel_pilot.core.models import (
    Approval,
    ApprovalAction,
    ApprovalStatus,
    Investigation,
    InvestigationStatus,
    Report,
    RiskLevel,
    Severity,
    TimelineItem,
    TimelineType,
)


def _utc_now() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _to_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _from_json(value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return json.loads(value)


class InvestigationRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def create(self, alert_id: str, severity: Severity, category: str) -> Investigation:
        now = _utc_now()
        investigation = Investigation(
            id=_new_id("inv"),
            alert_id=alert_id,
            status="created",
            summary="",
            severity=severity,
            category=category,
            mitre_techniques=[],
            error_message=None,
            created_at=now,
            updated_at=now,
        )
        self.connection.execute(
            """
            INSERT INTO investigations (
                id, alert_id, status, summary, severity, category, mitre_techniques,
                error_message, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                investigation.id,
                investigation.alert_id,
                investigation.status,
                investigation.summary,
                investigation.severity,
                investigation.category,
                json.dumps(investigation.mitre_techniques),
                investigation.error_message,
                _to_iso(investigation.created_at),
                _to_iso(investigation.updated_at),
            ),
        )
        self.connection.commit()
        return investigation

    def get(self, investigation_id: str) -> Investigation | None:
        row = self.connection.execute(
            "SELECT * FROM investigations WHERE id = ?",
            (investigation_id,),
        ).fetchone()
        if row is None:
            return None
        return Investigation(
            id=row["id"],
            alert_id=row["alert_id"],
            status=row["status"],
            summary=row["summary"],
            severity=row["severity"],
            category=row["category"],
            mitre_techniques=json.loads(row["mitre_techniques"]),
            error_message=row["error_message"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def list_recent(self, limit: int = 100) -> list[Investigation]:
        rows = self.connection.execute(
            """
            SELECT * FROM investigations
            ORDER BY updated_at DESC, created_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [
            Investigation(
                id=row["id"],
                alert_id=row["alert_id"],
                status=row["status"],
                summary=row["summary"],
                severity=row["severity"],
                category=row["category"],
                mitre_techniques=json.loads(row["mitre_techniques"]),
                error_message=row["error_message"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    def update_analysis(
        self,
        investigation_id: str,
        status: InvestigationStatus,
        summary: str,
        severity: Severity,
        category: str,
        mitre_techniques: list[str],
        error_message: str | None = None,
    ) -> Investigation:
        now = _utc_now()
        self.connection.execute(
            """
            UPDATE investigations
            SET status = ?, summary = ?, severity = ?, category = ?, mitre_techniques = ?,
                error_message = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                summary,
                severity,
                category,
                json.dumps(mitre_techniques),
                error_message,
                _to_iso(now),
                investigation_id,
            ),
        )
        self.connection.commit()
        investigation = self.get(investigation_id)
        if investigation is None:
            raise ValueError(f"Investigation not found after update: {investigation_id}")
        return investigation

    def update_status(self, investigation_id: str, status: InvestigationStatus) -> Investigation:
        now = _utc_now()
        self.connection.execute(
            """
            UPDATE investigations
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, _to_iso(now), investigation_id),
        )
        self.connection.commit()
        investigation = self.get(investigation_id)
        if investigation is None:
            raise ValueError(f"Investigation not found after status update: {investigation_id}")
        return investigation

    def mark_failed(self, investigation_id: str, error_message: str) -> Investigation:
        now = _utc_now()
        self.connection.execute(
            """
            UPDATE investigations
            SET status = ?, error_message = ?, updated_at = ?
            WHERE id = ?
            """,
            ("failed", error_message, _to_iso(now), investigation_id),
        )
        self.connection.commit()
        investigation = self.get(investigation_id)
        if investigation is None:
            raise ValueError(f"Investigation not found after failure update: {investigation_id}")
        return investigation


class TimelineRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def add(
        self,
        investigation_id: str,
        type: TimelineType,
        title: str,
        content: str,
        tool_name: str | None = None,
        input: dict[str, Any] | None = None,
        output: dict[str, Any] | None = None,
        created_at: datetime | None = None,
    ) -> TimelineItem:
        item = TimelineItem(
            id=_new_id("step"),
            investigation_id=investigation_id,
            type=type,
            title=title,
            content=content,
            tool_name=tool_name,
            input=input,
            output=output,
            created_at=created_at or _utc_now(),
        )
        self.connection.execute(
            """
            INSERT INTO timeline_items (
                id, investigation_id, type, title, content, tool_name, input, output, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.id,
                item.investigation_id,
                item.type,
                item.title,
                item.content,
                item.tool_name,
                json.dumps(item.input) if item.input is not None else None,
                json.dumps(item.output) if item.output is not None else None,
                _to_iso(item.created_at),
            ),
        )
        self.connection.commit()
        return item

    def list_by_investigation(self, investigation_id: str) -> list[TimelineItem]:
        rows = self.connection.execute(
            """
            SELECT * FROM timeline_items
            WHERE investigation_id = ?
            ORDER BY created_at ASC, id ASC
            """,
            (investigation_id,),
        ).fetchall()
        return [
            TimelineItem(
                id=row["id"],
                investigation_id=row["investigation_id"],
                type=row["type"],
                title=row["title"],
                content=row["content"],
                tool_name=row["tool_name"],
                input=_from_json(row["input"]),
                output=_from_json(row["output"]),
                created_at=row["created_at"],
            )
            for row in rows
        ]


class ApprovalRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def create(
        self,
        investigation_id: str,
        action_type: ApprovalAction,
        target: str,
        risk_level: RiskLevel,
        reason: str,
    ) -> Approval:
        approval = Approval(
            id=_new_id("appr"),
            investigation_id=investigation_id,
            action_type=action_type,
            target=target,
            risk_level=risk_level,
            reason=reason,
            status="pending",
            comment=None,
            created_at=_utc_now(),
            decided_at=None,
        )
        self.connection.execute(
            """
            INSERT INTO approvals (
                id, investigation_id, action_type, target, risk_level, reason,
                status, comment, created_at, decided_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                approval.id,
                approval.investigation_id,
                approval.action_type,
                approval.target,
                approval.risk_level,
                approval.reason,
                approval.status,
                approval.comment,
                _to_iso(approval.created_at),
                approval.decided_at,
            ),
        )
        self.connection.commit()
        return approval

    def get(self, approval_id: str) -> Approval | None:
        row = self.connection.execute(
            "SELECT * FROM approvals WHERE id = ?",
            (approval_id,),
        ).fetchone()
        if row is None:
            return None
        return Approval(
            id=row["id"],
            investigation_id=row["investigation_id"],
            action_type=row["action_type"],
            target=row["target"],
            risk_level=row["risk_level"],
            reason=row["reason"],
            status=row["status"],
            comment=row["comment"],
            created_at=row["created_at"],
            decided_at=row["decided_at"],
        )

    def update_decision(
        self,
        approval_id: str,
        status: ApprovalStatus,
        comment: str | None,
    ) -> Approval:
        decided_at = _utc_now()
        self.connection.execute(
            """
            UPDATE approvals
            SET status = ?, comment = ?, decided_at = ?
            WHERE id = ?
            """,
            (status, comment, _to_iso(decided_at), approval_id),
        )
        self.connection.commit()
        approval = self.get(approval_id)
        if approval is None:
            raise ValueError(f"Approval not found after decision update: {approval_id}")
        return approval

    def list_by_investigation(self, investigation_id: str) -> list[Approval]:
        rows = self.connection.execute(
            "SELECT * FROM approvals WHERE investigation_id = ? ORDER BY created_at ASC, id ASC",
            (investigation_id,),
        ).fetchall()
        return [self._from_row(row) for row in rows]

    def list_recent(self, limit: int = 100) -> list[Approval]:
        rows = self.connection.execute(
            """
            SELECT * FROM approvals
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [self._from_row(row) for row in rows]

    def _from_row(self, row: sqlite3.Row) -> Approval:
        return Approval(
            id=row["id"],
            investigation_id=row["investigation_id"],
            action_type=row["action_type"],
            target=row["target"],
            risk_level=row["risk_level"],
            reason=row["reason"],
            status=row["status"],
            comment=row["comment"],
            created_at=row["created_at"],
            decided_at=row["decided_at"],
        )


class ReportRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def create(self, investigation_id: str, content: str) -> Report:
        report = Report(
            id=_new_id("report"),
            investigation_id=investigation_id,
            format="markdown",
            content=content,
            created_at=_utc_now(),
        )
        self.connection.execute(
            """
            INSERT INTO reports (id, investigation_id, format, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                report.id,
                report.investigation_id,
                report.format,
                report.content,
                _to_iso(report.created_at),
            ),
        )
        self.connection.commit()
        return report

    def get_by_investigation(self, investigation_id: str) -> Report | None:
        row = self.connection.execute(
            "SELECT * FROM reports WHERE investigation_id = ? ORDER BY created_at DESC LIMIT 1",
            (investigation_id,),
        ).fetchone()
        if row is None:
            return None
        return Report(
            id=row["id"],
            investigation_id=row["investigation_id"],
            format=row["format"],
            content=row["content"],
            created_at=row["created_at"],
        )


SENSITIVE_CONFIG_KEYS = {
    "llm_api_key",
    "dingtalk_webhook_url",
    "dingtalk_secret",
    "dingtalk_client_secret",
    "dingtalk_card_callback_secret",
    "feishu_webhook_url",
    "feishu_secret",
    "wecom_webhook_url",
    "siem_api_key",
    "edr_api_key",
}


class SystemConfigRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def upsert_many(self, items: dict[str, str]) -> None:
        now = _to_iso(_utc_now())
        for key, value in items.items():
            self.connection.execute(
                """
                INSERT INTO system_config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (key, value, now),
            )
        self.connection.commit()

    def list_items(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT key, value, updated_at FROM system_config ORDER BY key ASC"
        ).fetchall()
        return [self._public_item(row["key"], row["value"], row["updated_at"]) for row in rows]

    def as_public_map(self) -> dict[str, dict[str, Any]]:
        return {item["key"]: item for item in self.list_items()}

    def raw_map(self) -> dict[str, str]:
        rows = self.connection.execute("SELECT key, value FROM system_config").fetchall()
        return {row["key"]: row["value"] for row in rows}

    def _public_item(self, key: str, value: str, updated_at: str) -> dict[str, Any]:
        is_sensitive = key in SENSITIVE_CONFIG_KEYS
        return {
            "key": key,
            "value": None if is_sensitive else value,
            "configured": bool(value),
            "sensitive": is_sensitive,
            "updated_at": updated_at,
        }
