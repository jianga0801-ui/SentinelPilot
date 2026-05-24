import base64
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from typing import Any

from sentinel_pilot.integrations.im.base import IMProvider


class FeishuProvider(IMProvider):
    def __init__(self, webhook_url: str, secret: str = "") -> None:
        self.webhook_url = webhook_url
        self.secret = secret

    def send_message(self, title: str, text: str) -> None:
        if not self.webhook_url:
            return

        timestamp = str(int(time.time()))
        payload: dict[str, Any] = {
            "msg_type": "interactive",
            "card": {
                "header": {"title": {"tag": "plain_text", "content": title}},
                "elements": [{"tag": "markdown", "content": text}],
            },
        }
        if self.secret:
            payload["timestamp"] = timestamp
            payload["sign"] = _feishu_signature(self.secret, timestamp)

        _post_json(self.webhook_url, payload)

    def get_status(self) -> dict[str, Any]:
        return {
            "provider": "feishu",
            "notification_only": True,
            "callback_enabled": False,
            "card_enabled": False,
        }


class WeComProvider(IMProvider):
    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    def send_message(self, title: str, text: str) -> None:
        if not self.webhook_url:
            return

        _post_json(
            self.webhook_url,
            {
                "msgtype": "markdown",
                "markdown": {"content": f"### {title}\n\n{text}"},
            },
        )

    def get_status(self) -> dict[str, Any]:
        return {
            "provider": "wecom",
            "notification_only": True,
            "callback_enabled": False,
            "card_enabled": False,
        }


def _feishu_signature(secret: str, timestamp: str) -> str:
    string_to_sign = f"{timestamp}\n{secret}"
    digest = hmac.new(
        string_to_sign.encode("utf-8"),
        b"",
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def _post_json(url: str, payload: dict[str, Any]) -> None:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()
    except urllib.error.URLError:
        pass
