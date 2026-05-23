from typing import Any, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["low", "medium", "high", "critical"]
RiskLevel = Literal["medium", "high", "critical"]
ActionMode = Literal["recommend_only", "approval_required", "auto_approve_simulated"]


class LLMAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_type: str
    target: str
    risk_level: RiskLevel
    reason: str


class LLMAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1)
    severity: Severity
    category: str = Field(min_length=1)
    mitre_techniques: list[str] = Field(default_factory=list)
    recommended_actions: list[LLMAction] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class LLMConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_mode: ActionMode = "approval_required"
    allow_high_risk_actions: bool = True
    allowed_actions: tuple[str, ...] = (
        "block_ip",
        "isolate_host",
        "disable_user",
        "collect_artifact",
        "notify_owner",
    )

    def apply(self, analysis: LLMAnalysis) -> LLMAnalysis:
        allowed = []
        for action in analysis.recommended_actions:
            if action.action_type not in self.allowed_actions:
                continue
            if action.risk_level in ("high", "critical") and not self.allow_high_risk_actions:
                continue
            allowed.append(action)
        return analysis.model_copy(update={"recommended_actions": allowed})

    def as_status(self) -> dict[str, Any]:
        return {
            "structured_output_required": True,
            "allowed_actions": list(self.allowed_actions),
            "action_mode": self.action_mode,
            "high_risk_actions_allowed": self.allow_high_risk_actions,
            "high_risk_requires_approval": self.action_mode != "auto_approve_simulated",
            "real_response_actions_enabled": False,
            "secrets_hidden": True,
        }


class LLMClient(Protocol):
    def analyze(self, context: dict[str, Any]) -> LLMAnalysis:
        """Return a structured investigation analysis from normalized evidence."""
