from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["low", "medium", "high", "critical"]
DeviceType = Literal[
    "waf",
    "ips",
    "ids",
    "antivirus",
    "edr",
    "ndr",
    "siem",
    "log_audit",
    "mock",
]
AlertStatus = Literal["new", "investigating", "closed"]
InvestigationStatus = Literal[
    "created",
    "running",
    "waiting_approval",
    "completed",
    "failed",
    "cancelled",
]
TimelineType = Literal[
    "agent_message",
    "tool_call",
    "tool_result",
    "approval_created",
    "approval_decision",
    "report_created",
    "error",
]
ApprovalAction = Literal[
    "block_ip",
    "isolate_host",
    "disable_user",
    "collect_artifact",
    "notify_owner",
]
RiskLevel = Literal["medium", "high", "critical"]
ApprovalStatus = Literal["pending", "approved", "rejected"]


class TimeRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: datetime
    end: datetime


class Alert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    description: str
    source: str
    vendor: str | None = None
    product: str | None = None
    device_type: DeviceType
    severity: Severity
    category: str
    status: AlertStatus = "new"
    entities: dict[str, Any]
    time_range: TimeRange
    raw: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class Investigation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    alert_id: str
    status: InvestigationStatus
    summary: str = ""
    severity: Severity
    category: str
    mitre_techniques: list[str] = Field(default_factory=list)
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class TimelineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    investigation_id: str
    type: TimelineType
    title: str
    content: str
    tool_name: str | None = None
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    created_at: datetime


class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    investigation_id: str
    action_type: ApprovalAction
    target: str
    risk_level: RiskLevel
    reason: str
    status: ApprovalStatus = "pending"
    comment: str | None = None
    created_at: datetime
    decided_at: datetime | None = None


class Report(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    investigation_id: str
    format: Literal["markdown"] = "markdown"
    content: str
    created_at: datetime
