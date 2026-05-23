from typing import Any

from sentinel_pilot.llm.base import LLMAnalysis


class MockLLMClient:
    def analyze(self, context: dict[str, Any]) -> LLMAnalysis:
        alert = context.get("alert", {})
        category = alert.get("category") if isinstance(alert, dict) else "unknown"
        return LLMAnalysis(
            summary="Mock model reviewed the normalized evidence and found no extra action.",
            severity="medium",
            category=category or "unknown",
            mitre_techniques=[],
            recommended_actions=[],
            confidence=0.5,
        )
