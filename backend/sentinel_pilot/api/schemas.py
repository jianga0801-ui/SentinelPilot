from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from sentinel_pilot.core.models import (
    AlertStatus,
    ApprovalAction,
    ApprovalStatus,
    DeviceType,
    Investigation,
    InvestigationStatus,
    RiskLevel,
    Severity,
    TimelineItem,
)


class AlertListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    source: str
    vendor: str | None
    product: str | None
    device_type: DeviceType
    severity: Severity
    category: str
    created_at: datetime
    status: AlertStatus


class AlertListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AlertListItem]


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


class InvestigationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alert_id: str


class InvestigationCreateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    alert_id: str
    status: InvestigationStatus
    created_at: datetime


class InvestigationRunResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: InvestigationStatus


class InvestigationListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[Investigation]


class TimelineResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[TimelineItem]


class ApprovalListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    investigation_id: str
    action_type: ApprovalAction
    target: str
    risk_level: RiskLevel
    reason: str
    status: ApprovalStatus
    comment: str | None
    created_at: datetime
    decided_at: datetime | None


class ApprovalListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ApprovalListItem]


class ApprovalDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["approved", "rejected"]
    comment: str | None = None


class ApprovalDecisionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: ApprovalStatus
