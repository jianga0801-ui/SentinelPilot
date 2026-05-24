import logging
from typing import Any

from sentinel_pilot.config import Settings
from sentinel_pilot.core.models import Approval, Report
from sentinel_pilot.integrations.im.base import IMProvider
from sentinel_pilot.integrations.im.dingtalk import DingTalkProvider
from sentinel_pilot.integrations.im.webhook import FeishuProvider, WeComProvider

logger = logging.getLogger(__name__)


class IMNotifier:
    def __init__(self, settings: Settings) -> None:
        self.enabled = settings.im_notification_enabled
        self.public_app_url = settings.public_app_url.rstrip("/")
        self.provider: IMProvider | None = None
        self.last_error: str | None = None
        self.dingtalk_card_callback_secret = settings.dingtalk_card_callback_secret

        provider_name = settings.im_provider.lower()
        if provider_name == "dingtalk":
            self.provider = DingTalkProvider(
                webhook_url=settings.dingtalk_webhook_url,
                secret=settings.dingtalk_secret,
                client_id=settings.dingtalk_client_id,
                client_secret=settings.dingtalk_client_secret,
                robot_code=settings.dingtalk_robot_code,
                open_conversation_id=settings.dingtalk_open_conversation_id,
                card_template_id=settings.dingtalk_card_template_id,
                card_callback_url=settings.dingtalk_card_callback_url,
                card_callback_secret=settings.dingtalk_card_callback_secret,
            )
        elif provider_name == "feishu":
            self.provider = FeishuProvider(
                webhook_url=settings.feishu_webhook_url,
                secret=settings.feishu_secret,
            )
        elif provider_name == "wecom":
            self.provider = WeComProvider(webhook_url=settings.wecom_webhook_url)

    def get_status(self) -> dict[str, Any]:
        if not self.provider:
            return {
                "enabled": self.enabled,
                "provider": "unknown",
                "notification_only": True,
                "callback_enabled": False,
                "card_enabled": False,
            }

        status = self.provider.get_status()
        status["enabled"] = self.enabled
        status["last_error"] = self.last_error
        return status

    def send_test_message(self) -> bool:
        if not self.enabled or not self.provider:
            return False

        title = "SentinelPilot Notification Test"
        text = f"### {title}\n\nYour SentinelPilot IM integration is configured correctly."
        return self._send_message(title, text)

    def send_approval_required(self, approval: Approval) -> bool:
        if not self.enabled or not self.provider:
            return False

        if isinstance(self.provider, DingTalkProvider) and self.provider.card_enabled:
            return self._send_approval_card(approval)

        title = "Action Approval Required"
        link = f"{self.public_app_url}/investigations/{approval.investigation_id}"

        text = f"### {title}\n\n"
        text += f"**Investigation ID**: {approval.investigation_id}\n\n"
        text += f"**Action**: `{approval.action_type}`\n\n"
        text += f"**Target**: `{approval.target}`\n\n"
        text += f"**Risk Level**: {approval.risk_level.upper()}\n\n"
        text += f"**Reason**: {approval.reason}\n\n"
        text += f"[Review Investigation]({link})"

        return self._send_message(title, text)

    def send_investigation_completed(self, report: Report) -> bool:
        if not self.enabled or not self.provider:
            return False

        title = "Investigation Completed"
        link = f"{self.public_app_url}/investigations/{report.investigation_id}"

        text = f"### {title}\n\n"
        text += f"**Investigation ID**: {report.investigation_id}\n\n"
        text += "The automated investigation concluded and a final report was generated.\n\n"
        text += f"[View Report]({link})"

        return self._send_message(title, text)

    def _send_message(self, title: str, text: str) -> bool:
        if self.provider is None:
            return False

        try:
            self.provider.send_message(title, text)
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {exc}"
            logger.warning("IM notification failed: %s", self.last_error)
            return False

        self.last_error = None
        return True

    def _send_approval_card(self, approval: Approval) -> bool:
        if not isinstance(self.provider, DingTalkProvider):
            return False

        try:
            self.provider.send_approval_card(
                approval=approval,
                public_app_url=self.public_app_url,
            )
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {exc}"
            logger.warning("IM approval card failed: %s", self.last_error)
            return False

        self.last_error = None
        return True
