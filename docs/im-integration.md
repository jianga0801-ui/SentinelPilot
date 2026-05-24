# IM Integration

SentinelPilot supports local configuration for three robot notification channels:

- DingTalk robot webhook
- Feishu custom bot webhook
- WeCom group robot webhook

DingTalk additionally supports interactive approval cards. Feishu and WeCom currently operate as notification-only robot channels.

## Configuration

```env
IM_PROVIDER=dingtalk
IM_NOTIFICATION_ENABLED=false

DINGTALK_WEBHOOK_URL=
DINGTALK_SECRET=
FEISHU_WEBHOOK_URL=
FEISHU_SECRET=
WECOM_WEBHOOK_URL=

DINGTALK_CLIENT_ID=
DINGTALK_CLIENT_SECRET=
DINGTALK_ROBOT_CODE=
DINGTALK_OPEN_CONVERSATION_ID=
DINGTALK_CARD_TEMPLATE_ID=
DINGTALK_CARD_CALLBACK_URL=
DINGTALK_CARD_CALLBACK_SECRET=

PUBLIC_APP_URL=http://localhost:3000
```

Runtime settings can also be edited from the Settings Center. Secret values are stored locally and are never returned to the frontend as plaintext.

## Provider Behavior

- DingTalk: markdown webhook fallback, optional signature, optional interactive approval card.
- Feishu: interactive-card style robot message, optional bot signature.
- WeCom: markdown group robot message.

If notification is disabled or a webhook is missing, business workflows still continue. Notification failure must not block investigation completion or approval creation.

## DingTalk Card Callback

```http
POST /api/integrations/im/dingtalk/card-callback
```

The callback endpoint validates DingTalk callback headers:

```text
x-ddpaas-signature-timestamp
x-ddpaas-signature
```

SentinelPilot calculates `base64(hmac_sha256(DINGTALK_CARD_CALLBACK_SECRET, timestamp))` and rejects invalid callbacks with `401`.

## Verification

Default verification does not require real IM credentials:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests\test_im_notifier.py -q
```

Live robot delivery should be tested later with real webhook values in local `.env`.
