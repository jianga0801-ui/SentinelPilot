import base64
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from sentinel_pilot.core.models import Approval
from sentinel_pilot.integrations.im.base import IMProvider


class DingTalkProvider(IMProvider):
    def __init__(
        self,
        webhook_url: str,
        secret: str = "",
        client_id: str = "",
        client_secret: str = "",
        robot_code: str = "",
        open_conversation_id: str = "",
        card_template_id: str = "",
        card_callback_url: str = "",
        card_callback_secret: str = "",
    ) -> None:
        self.webhook_url = webhook_url
        self.secret = secret
        self.client_id = client_id
        self.client_secret = client_secret
        self.robot_code = robot_code
        self.open_conversation_id = open_conversation_id
        self.card_template_id = card_template_id
        self.card_callback_url = card_callback_url
        self.card_callback_secret = card_callback_secret
        self._access_token: str | None = None
        self._access_token_expires_at = 0.0

    @property
    def card_enabled(self) -> bool:
        return all(
            [
                self.client_id,
                self.client_secret,
                self.robot_code,
                self.open_conversation_id,
                self.card_template_id,
                self.card_callback_url,
            ]
        )

    def send_message(self, title: str, text: str) -> None:
        if not self.webhook_url:
            return

        url = self.webhook_url
        if self.secret:
            timestamp = str(round(time.time() * 1000))
            secret_enc = self.secret.encode("utf-8")
            string_to_sign = f"{timestamp}\n{self.secret}"
            string_to_sign_enc = string_to_sign.encode("utf-8")
            hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
            sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
            url = f"{self.webhook_url}&timestamp={timestamp}&sign={sign}"

        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": title,
                "text": text,
            },
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                response.read()
        except urllib.error.URLError:
            # We fail silently or log in a real app, but here we can just pass
            # as it's a one-way notification.
            pass

    def send_approval_card(self, approval: Approval, public_app_url: str) -> None:
        if not self.card_enabled:
            return

        token = self._get_access_token()
        link = f"{public_app_url.rstrip('/')}/investigations/{approval.investigation_id}"
        card_data = {
            "cardParamMap": {
                "title": "SentinelPilot Action Approval",
                "summary": "High-risk response action requires review.",
                "approval_id": approval.id,
                "investigation_id": approval.investigation_id,
                "action_type": approval.action_type,
                "target": approval.target,
                "risk_level": approval.risk_level,
                "reason": approval.reason,
                "status": approval.status,
                "review_url": link,
                "approve_action": "approved",
                "reject_action": "rejected",
            }
        }
        payload = {
            "cardTemplateId": self.card_template_id,
            "openConversationId": self.open_conversation_id,
            "cardBizId": approval.id,
            "robotCode": self.robot_code,
            "callbackUrl": self.card_callback_url,
            "cardData": json.dumps(card_data, ensure_ascii=False),
        }
        self._post_json(
            "https://api.dingtalk.com/v1.0/im/v1.0/robot/interactiveCards/send",
            payload,
            headers={"x-acs-dingtalk-access-token": token},
        )

    def get_status(self) -> dict[str, Any]:
        callback_enabled = bool(self.card_callback_url and self.card_callback_secret)
        return {
            "provider": "dingtalk",
            "notification_only": not self.card_enabled,
            "callback_enabled": callback_enabled,
            "card_enabled": self.card_enabled,
        }

    def _get_access_token(self) -> str:
        now = time.time()
        if self._access_token and now < self._access_token_expires_at:
            return self._access_token

        payload = {
            "appKey": self.client_id,
            "appSecret": self.client_secret,
        }
        response = self._post_json(
            "https://api.dingtalk.com/v1.0/oauth2/accessToken",
            payload,
        )
        token = response.get("accessToken")
        if not isinstance(token, str) or not token:
            raise RuntimeError("DingTalk accessToken response did not include accessToken.")
        expire_in = response.get("expireIn")
        ttl = float(expire_in) if isinstance(expire_in, int | float) else 7200.0
        self._access_token = token
        self._access_token_expires_at = now + max(60.0, ttl - 60.0)
        return token

    def _post_json(
        self,
        url: str,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=request_headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read()
        if not body:
            return {}
        parsed = json.loads(body.decode("utf-8"))
        if not isinstance(parsed, dict):
            raise RuntimeError("DingTalk response was not a JSON object.")
        return parsed
