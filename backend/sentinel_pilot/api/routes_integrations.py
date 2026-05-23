import base64
import hashlib
import hmac
import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request

from sentinel_pilot.api.dependencies import get_approval_service, get_im_notifier
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.services.approval_service import ApprovalService

router = APIRouter(prefix="/api/integrations/im", tags=["Integrations"])


@router.get("/status")
def get_im_status(
    notifier: IMNotifier = Depends(get_im_notifier),  # noqa: B008
) -> dict[str, Any]:
    return notifier.get_status()


@router.post("/test")
def test_im_notification(
    notifier: IMNotifier = Depends(get_im_notifier),  # noqa: B008
) -> dict[str, Any]:
    notifier.send_test_message()
    return {
        "ok": True,
        "provider": notifier.get_status().get("provider", "unknown"),
        "message": "Test notification sent.",
    }


@router.post("/dingtalk/card-callback")
async def handle_dingtalk_card_callback(
    request: Request,
    service: Annotated[ApprovalService, Depends(get_approval_service)],
    notifier: Annotated[IMNotifier, Depends(get_im_notifier)],
) -> dict[str, Any]:
    secret = notifier.dingtalk_card_callback_secret
    _verify_callback_signature(
        secret=secret,
        timestamp=request.headers.get("x-ddpaas-signature-timestamp"),
        signature=request.headers.get("x-ddpaas-signature"),
    )

    body = await request.json()
    params = _extract_card_callback_params(body)
    approval_id = _required_param(params, "approval_id")
    decision = _normalize_decision(_required_param(params, "decision"))
    user_id = body.get("userId")
    comment = f"DingTalk card action by {user_id}." if user_id else "DingTalk card action."
    approval = service.decide(approval_id, decision, comment)

    return {
        "ok": True,
        "approval_id": approval.id,
        "status": approval.status,
        "cardData": {
            "cardParamMap": {
                "approval_id": approval.id,
                "approval_status": approval.status,
                "approval_comment": approval.comment or "",
            }
        },
    }


def _verify_callback_signature(
    secret: str,
    timestamp: str | None,
    signature: str | None,
) -> None:
    if not secret:
        raise SentinelPilotError(
            code="callback_not_configured",
            message="DingTalk card callback secret is not configured.",
            status_code=403,
        )
    if not timestamp or not signature:
        raise SentinelPilotError(
            code="invalid_signature",
            message="Invalid DingTalk card callback signature.",
            status_code=401,
        )

    digest = hmac.new(
        secret.encode("utf-8"),
        timestamp.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    if not hmac.compare_digest(expected, signature):
        raise SentinelPilotError(
            code="invalid_signature",
            message="Invalid DingTalk card callback signature.",
            status_code=401,
        )


def _extract_card_callback_params(body: dict[str, Any]) -> dict[str, Any]:
    if body.get("type") != "actionCallback":
        raise SentinelPilotError(
            code="invalid_callback",
            message="Unsupported DingTalk card callback type.",
            status_code=400,
        )

    content = body.get("content")
    if not isinstance(content, str):
        raise SentinelPilotError(
            code="invalid_callback",
            message="DingTalk card callback content must be a JSON string.",
            status_code=400,
        )
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise SentinelPilotError(
            code="invalid_callback",
            message="DingTalk card callback content is not valid JSON.",
            status_code=400,
        ) from exc

    params = parsed.get("cardPrivateData", {}).get("params", {})
    if not isinstance(params, dict):
        raise SentinelPilotError(
            code="invalid_callback",
            message="DingTalk card callback params must be an object.",
            status_code=400,
        )
    return params


def _required_param(params: dict[str, Any], key: str) -> str:
    value = params.get(key)
    if not isinstance(value, str) or not value:
        raise SentinelPilotError(
            code="invalid_callback",
            message=f"DingTalk card callback missing required param: {key}.",
            status_code=400,
        )
    return value


def _normalize_decision(value: str) -> str:
    if value in ("approve", "approved"):
        return "approved"
    if value in ("reject", "rejected"):
        return "rejected"
    raise SentinelPilotError(
        code="invalid_callback",
        message=f"Unsupported DingTalk approval decision: {value}.",
        status_code=400,
    )
