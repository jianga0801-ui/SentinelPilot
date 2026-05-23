from typing import Any

from sentinel_pilot.config import Settings
from sentinel_pilot.llm.base import LLMClient, LLMConstraints
from sentinel_pilot.llm.mock import MockLLMClient
from sentinel_pilot.llm.openai_compatible import OpenAICompatibleLLMClient


def constraints_from_settings(settings: Settings) -> LLMConstraints:
    return LLMConstraints(
        action_mode=settings.llm_action_mode,
        allow_high_risk_actions=settings.llm_allow_high_risk_actions,
    )


def create_llm_client(settings: Settings) -> LLMClient:
    constraints = constraints_from_settings(settings)
    if settings.llm_provider == "mock":
        return MockLLMClient()
    return OpenAICompatibleLLMClient(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        timeout_seconds=settings.llm_timeout_seconds,
        prompt_profile=settings.llm_prompt_profile,
        constraints=constraints,
    )


def get_llm_status(settings: Settings) -> dict[str, Any]:
    constraints = constraints_from_settings(settings)
    return {
        "enabled": settings.llm_enabled,
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        "base_url_configured": bool(settings.llm_base_url),
        "api_key_configured": bool(settings.llm_api_key),
        "prompt_profile": settings.llm_prompt_profile,
        "temperature": settings.llm_temperature,
        "timeout_seconds": settings.llm_timeout_seconds,
        "action_mode": settings.llm_action_mode,
        "constraints": constraints.as_status(),
        "supported_providers": ["mock", "openai_compatible"],
        "supported_action_modes": [
            "recommend_only",
            "approval_required",
            "auto_approve_simulated",
        ],
    }
