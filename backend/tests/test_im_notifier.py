import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from sentinel_pilot.config import Settings
from sentinel_pilot.core.models import Approval, Report
from sentinel_pilot.integrations.im.dingtalk import DingTalkProvider
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.integrations.im.webhook import FeishuProvider, WeComProvider
from sentinel_pilot.main import app


@pytest.fixture
def mock_settings() -> Settings:
    return Settings(
        app_name="TestApp",
        database_url="sqlite:///:memory:",
        im_provider="dingtalk",
        im_notification_enabled=True,
        dingtalk_webhook_url="http://dummy-webhook",
        dingtalk_secret="dummy-secret",
        dingtalk_client_id="dummy-client-id",
        dingtalk_client_secret="dummy-client-secret",
        dingtalk_robot_code="dummy-robot",
        dingtalk_open_conversation_id="dummy-conversation",
        dingtalk_card_template_id="dummy-template",
        dingtalk_card_callback_url="https://sentinel.example/api/integrations/im/dingtalk/card-callback",
        dingtalk_card_callback_secret="callback-secret",
        public_app_url="http://test-app",
    )


@pytest.fixture
def notifier(mock_settings: Settings) -> IMNotifier:
    return IMNotifier(mock_settings)


def test_notifier_initialization(notifier: IMNotifier):
    assert notifier.enabled is True
    assert isinstance(notifier.provider, DingTalkProvider)
    assert notifier.provider.webhook_url == "http://dummy-webhook"


def test_notifier_status(notifier: IMNotifier):
    status = notifier.get_status()
    assert status["enabled"] is True
    assert status["provider"] == "dingtalk"
    assert status["notification_only"] is False
    assert status["callback_enabled"] is True


def test_notifier_initializes_feishu_provider():
    notifier = IMNotifier(
        Settings(
            database_url="sqlite:///:memory:",
            im_provider="feishu",
            im_notification_enabled=True,
            feishu_webhook_url="http://feishu-webhook",
            feishu_secret="feishu-secret",
        )
    )

    assert isinstance(notifier.provider, FeishuProvider)
    status = notifier.get_status()
    assert status["provider"] == "feishu"
    assert status["notification_only"] is True


def test_notifier_initializes_wecom_provider():
    notifier = IMNotifier(
        Settings(
            database_url="sqlite:///:memory:",
            im_provider="wecom",
            im_notification_enabled=True,
            wecom_webhook_url="http://wecom-webhook",
        )
    )

    assert isinstance(notifier.provider, WeComProvider)
    assert notifier.get_status()["provider"] == "wecom"


@patch.object(DingTalkProvider, "send_message")
def test_send_test_message(mock_send, notifier: IMNotifier):
    notifier.send_test_message()
    mock_send.assert_called_once()
    args, _ = mock_send.call_args
    assert "SentinelPilot Notification Test" in args[0]


@patch.object(DingTalkProvider, "send_message")
def test_send_approval_required_falls_back_to_webhook(mock_send, mock_settings: Settings):
    mock_settings.dingtalk_client_id = ""
    notifier = IMNotifier(mock_settings)
    approval = Approval(
        id="appr_123",
        investigation_id="inv_abc",
        action_type="block_ip",
        target="10.0.0.1",
        risk_level="high",
        reason="Malicious IP",
        status="pending",
        created_at=datetime.now(UTC),
    )
    notifier.send_approval_required(approval)
    mock_send.assert_called_once()
    args, _ = mock_send.call_args
    assert "Action Approval Required" in args[0]
    assert "10.0.0.1" in args[1]
    assert "http://test-app/investigations/inv_abc" in args[1]


def test_send_approval_required_prefers_interactive_card(notifier: IMNotifier):
    approval = Approval(
        id="appr_123",
        investigation_id="inv_abc",
        action_type="block_ip",
        target="10.0.0.1",
        risk_level="high",
        reason="Malicious IP",
        status="pending",
        created_at=datetime.now(UTC),
    )
    assert isinstance(notifier.provider, DingTalkProvider)
    notifier.provider.send_approval_card = Mock()
    notifier.provider.send_message = Mock()

    notifier.send_approval_required(approval)

    notifier.provider.send_approval_card.assert_called_once_with(
        approval=approval,
        public_app_url="http://test-app",
    )
    notifier.provider.send_message.assert_not_called()


def test_dingtalk_provider_sends_interactive_approval_card():
    provider = DingTalkProvider(
        webhook_url="",
        secret="",
        client_id="client-id",
        client_secret="client-secret",
        robot_code="robot-code",
        open_conversation_id="conversation-id",
        card_template_id="template-id",
        card_callback_url="https://sentinel.example/callback",
        card_callback_secret="callback-secret",
    )
    approval = Approval(
        id="appr_123",
        investigation_id="inv_abc",
        action_type="block_ip",
        target="10.0.0.1",
        risk_level="high",
        reason="Malicious IP",
        status="pending",
        created_at=datetime.now(UTC),
    )

    responses = [
        Mock(read=Mock(return_value=json.dumps({"accessToken": "access-token"}).encode())),
        Mock(read=Mock(return_value=json.dumps({"processQueryKey": "query-key"}).encode())),
    ]
    requests = []

    def fake_urlopen(request, timeout):
        requests.append(request)
        return responses.pop(0)

    for response in responses:
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=None)

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        provider.send_approval_card(approval=approval, public_app_url="http://test-app")

    assert len(requests) == 2
    token_payload = json.loads(requests[0].data.decode("utf-8"))
    assert token_payload == {"appKey": "client-id", "appSecret": "client-secret"}
    card_payload = json.loads(requests[1].data.decode("utf-8"))
    card_data = json.loads(card_payload["cardData"])
    assert card_payload["cardTemplateId"] == "template-id"
    assert card_payload["openConversationId"] == "conversation-id"
    assert card_payload["robotCode"] == "robot-code"
    assert card_payload["callbackUrl"] == "https://sentinel.example/callback"
    assert card_data["cardParamMap"]["approval_id"] == "appr_123"
    assert card_data["cardParamMap"]["approve_action"] == "approved"
    assert card_data["cardParamMap"]["reject_action"] == "rejected"


@patch.object(DingTalkProvider, "send_message")
def test_send_investigation_completed(mock_send, notifier: IMNotifier):
    report = Report(
        id="rep_xyz",
        investigation_id="inv_abc",
        format="markdown",
        content="# Test Report",
        created_at=datetime.now(UTC),
    )
    notifier.send_investigation_completed(report)
    mock_send.assert_called_once()
    args, _ = mock_send.call_args
    assert "Investigation Completed" in args[0]
    assert "http://test-app/investigations/inv_abc" in args[1]


@patch.object(DingTalkProvider, "send_message")
def test_notifier_disabled(mock_send, mock_settings: Settings):
    mock_settings.im_notification_enabled = False
    notifier = IMNotifier(mock_settings)

    notifier.send_test_message()
    mock_send.assert_not_called()


@patch.object(DingTalkProvider, "send_message", side_effect=RuntimeError("provider failed"))
def test_provider_exception_does_not_escape_business_notification(
    mock_send,
    mock_settings: Settings,
):
    mock_settings.dingtalk_client_id = ""
    notifier = IMNotifier(mock_settings)
    approval = Approval(
        id="appr_123",
        investigation_id="inv_abc",
        action_type="block_ip",
        target="10.0.0.1",
        risk_level="high",
        reason="Malicious IP",
        status="pending",
        created_at=datetime.now(UTC),
    )

    sent = notifier.send_approval_required(approval)

    assert sent is False
    assert "provider failed" in (notifier.last_error or "")
    mock_send.assert_called_once()


def test_dingtalk_card_callback_decides_approval():
    timestamp = "1763796000000"
    signature = _dingtalk_callback_signature("callback-secret", timestamp)

    with TestClient(app) as client:
        client.app.state.im_notifier.dingtalk_card_callback_secret = "callback-secret"
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")
        approval = client.get(f"/api/investigations/{created['id']}/approvals").json()["items"][0]

        response = client.post(
            "/api/integrations/im/dingtalk/card-callback",
            headers={
                "x-ddpaas-signature-timestamp": timestamp,
                "x-ddpaas-signature": signature,
            },
            json={
                "type": "actionCallback",
                "outTrackId": approval["id"],
                "corpId": "ding-test",
                "userId": "manager001",
                "content": json.dumps(
                    {
                        "cardPrivateData": {
                            "params": {
                                "approval_id": approval["id"],
                                "decision": "approved",
                            }
                        }
                    }
                ),
            },
        )
        approvals = client.get(f"/api/investigations/{created['id']}/approvals").json()

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert approvals["items"][0]["status"] == "approved"
    assert approvals["items"][0]["comment"] == "DingTalk card action by manager001."


def test_dingtalk_card_callback_rejects_invalid_signature():
    with TestClient(app) as client:
        client.app.state.im_notifier.dingtalk_card_callback_secret = "callback-secret"
        response = client.post(
            "/api/integrations/im/dingtalk/card-callback",
            headers={
                "x-ddpaas-signature-timestamp": "1763796000000",
                "x-ddpaas-signature": "invalid",
            },
            json={
                "type": "actionCallback",
                "outTrackId": "appr_123",
                "content": json.dumps(
                    {
                        "cardPrivateData": {
                            "params": {
                                "approval_id": "appr_123",
                                "decision": "approved",
                            }
                        }
                    }
                ),
            },
        )

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "invalid_signature",
            "message": "Invalid DingTalk card callback signature.",
        }
    }


def _dingtalk_callback_signature(secret: str, timestamp: str) -> str:
    digest = hmac.new(
        secret.encode("utf-8"),
        timestamp.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")
