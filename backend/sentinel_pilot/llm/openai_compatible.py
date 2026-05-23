import json
import urllib.error
import urllib.request
from typing import Any

from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.llm.base import LLMAnalysis, LLMConstraints


class OpenAICompatibleLLMClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        temperature: float,
        timeout_seconds: int,
        prompt_profile: str,
        constraints: LLMConstraints,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.timeout_seconds = timeout_seconds
        self.prompt_profile = prompt_profile
        self.constraints = constraints

    def analyze(self, context: dict[str, Any]) -> LLMAnalysis:
        if not self.base_url or not self.api_key or not self.model:
            raise SentinelPilotError(
                code="llm_not_configured",
                message="LLM base URL, API key, and model must be configured.",
                status_code=503,
            )

        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": self._system_prompt()},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ],
        }
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise SentinelPilotError(
                code="llm_provider_error",
                message="LLM provider request failed.",
                status_code=502,
            ) from exc

        content = (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
        )
        try:
            return LLMAnalysis.model_validate_json(content)
        except ValueError as exc:
            raise SentinelPilotError(
                code="llm_invalid_output",
                message="LLM provider returned output that does not match the required schema.",
                status_code=502,
            ) from exc

    def _system_prompt(self) -> str:
        return (
            "You are SentinelPilot's security investigation coprocessor. "
            "Return only one JSON object matching this schema: "
            "{summary, severity, category, mitre_techniques, recommended_actions, confidence}. "
            "Use only the supplied evidence. Do not invent logs, users, IPs, or device state. "
            "Recommended actions must use only these action_type values: "
            f"{', '.join(self.constraints.allowed_actions)}. "
            "Real response actions are disabled; high-risk work must be represented as "
            "approval or simulated action recommendations according to policy. "
            f"Prompt profile: {self.prompt_profile}."
        )
