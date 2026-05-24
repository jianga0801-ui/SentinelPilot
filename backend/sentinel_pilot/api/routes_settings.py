from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from sentinel_pilot.config import Settings, settings
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.llm.factory import constraints_from_settings, create_llm_client
from sentinel_pilot.storage.repositories import SENSITIVE_CONFIG_KEYS, SystemConfigRepository

router = APIRouter(prefix="/api/settings", tags=["settings"])


DEFAULT_CONFIG: dict[str, str] = {
    "default_language": "zh",
    "llm_enabled": str(settings.llm_enabled).lower(),
    "llm_provider": settings.llm_provider,
    "llm_base_url": settings.llm_base_url,
    "llm_api_key": settings.llm_api_key,
    "llm_model": settings.llm_model,
    "llm_prompt_profile": settings.llm_prompt_profile,
    "llm_action_mode": settings.llm_action_mode,
    "llm_allow_high_risk_actions": str(settings.llm_allow_high_risk_actions).lower(),
    "im_notification_enabled": str(settings.im_notification_enabled).lower(),
    "im_provider": settings.im_provider,
    "dingtalk_webhook_url": settings.dingtalk_webhook_url,
    "dingtalk_secret": settings.dingtalk_secret,
    "dingtalk_card_callback_url": settings.dingtalk_card_callback_url,
    "feishu_webhook_url": settings.feishu_webhook_url,
    "feishu_secret": settings.feishu_secret,
    "wecom_webhook_url": settings.wecom_webhook_url,
    "public_app_url": settings.public_app_url,
    "log_retention_days": "14",
    "auto_investigate_high_risk": "false",
}


class SettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: dict[str, str] = Field(default_factory=dict)


def _get_repo(request: Request) -> SystemConfigRepository:
    return request.app.state.system_config


@router.get("")
def list_settings(request: Request) -> dict[str, Any]:
    return {"items": _merged_settings(_get_repo(request))}


@router.patch("")
def update_settings(request: Request, payload: SettingsUpdateRequest) -> dict[str, Any]:
    repo = _get_repo(request)
    allowed_items = {key: value for key, value in payload.items.items() if key in DEFAULT_CONFIG}
    repo.upsert_many(allowed_items)
    _reload_runtime_settings(request, repo)
    return {"items": _merged_settings(repo)}


@router.get("/status")
def settings_status(request: Request) -> dict[str, Any]:
    items = _merged_settings(_get_repo(request))
    return {
        "editable_keys": sorted(DEFAULT_CONFIG),
        "sensitive_keys": sorted(SENSITIVE_CONFIG_KEYS.intersection(DEFAULT_CONFIG)),
        "configured_count": sum(1 for item in items.values() if item["configured"]),
    }


def _merged_settings(repo: SystemConfigRepository) -> dict[str, dict[str, Any]]:
    saved = repo.as_public_map()
    merged: dict[str, dict[str, Any]] = {}
    for key, default_value in DEFAULT_CONFIG.items():
        if key in saved:
            merged[key] = saved[key]
            continue
        is_sensitive = key in SENSITIVE_CONFIG_KEYS
        merged[key] = {
            "key": key,
            "value": None if is_sensitive else default_value,
            "configured": bool(default_value),
            "sensitive": is_sensitive,
            "updated_at": None,
        }
    return merged


def _reload_runtime_settings(request: Request, repo: SystemConfigRepository) -> None:
    values = settings.model_dump()
    values.update(repo.raw_map())
    runtime_settings = Settings(**values)
    request.app.state.runtime_settings = runtime_settings
    request.app.state.im_notifier = IMNotifier(runtime_settings)
    request.app.state.llm_client = (
        create_llm_client(runtime_settings) if runtime_settings.llm_enabled else None
    )
    request.app.state.llm_constraints = constraints_from_settings(runtime_settings)

    request.app.state.investigation_service.im_notifier = request.app.state.im_notifier
    request.app.state.investigation_service.llm_client = request.app.state.llm_client
    request.app.state.investigation_service.llm_constraints = request.app.state.llm_constraints
    request.app.state.report_service.im_notifier = request.app.state.im_notifier
