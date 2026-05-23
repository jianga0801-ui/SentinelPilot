# IM Integration

SentinelPilot supports DingTalk notifications for investigation lifecycle events. The preferred mode is an interactive approval card: when a high-risk response action needs approval, DingTalk users can approve or reject from the card, and SentinelPilot records the decision through the backend approval service.

Webhook markdown messages remain available as a fallback for environments that do not have DingTalk interactive card delivery configured.

## Supported Events

- Approval required: sends an interactive DingTalk card when card configuration is complete, otherwise falls back to a markdown webhook message.
- Card approval callback: records `approved` or `rejected` decisions after validating the DingTalk callback signature.
- Investigation completed: sends a markdown summary when notification is enabled and webhook configuration is present.
- Test notification: exposes an API endpoint for checking provider configuration without requiring a live investigation.

## Configuration

Keep real values in local `.env`, the deployment environment, or a secret manager. Do not commit them.

```env
IM_PROVIDER=dingtalk
IM_NOTIFICATION_ENABLED=true

# Optional webhook fallback.
DINGTALK_WEBHOOK_URL=
DINGTALK_SECRET=

# Interactive card approval.
DINGTALK_CLIENT_ID=
DINGTALK_CLIENT_SECRET=
DINGTALK_ROBOT_CODE=
DINGTALK_OPEN_CONVERSATION_ID=
DINGTALK_CARD_TEMPLATE_ID=
DINGTALK_CARD_CALLBACK_URL=
DINGTALK_CARD_CALLBACK_SECRET=

PUBLIC_APP_URL=http://localhost:3000
```

`DINGTALK_CARD_CALLBACK_URL` must be reachable by DingTalk for real button clicks. Local development can still run the callback endpoint and signature tests without sending a live card.

## Backend Endpoints

```http
GET /api/integrations/im/status
POST /api/integrations/im/test
POST /api/integrations/im/dingtalk/card-callback
```

The callback endpoint expects DingTalk HTTP callback headers:

```text
x-ddpaas-signature-timestamp
x-ddpaas-signature
```

SentinelPilot calculates `base64(hmac_sha256(DINGTALK_CARD_CALLBACK_SECRET, timestamp))` and rejects invalid callbacks with `401`.

## DingTalk Card Params

The card template should send these params when users click approval buttons:

```json
{
  "approval_id": "appr_001",
  "decision": "approved"
}
```

Use `decision: "rejected"` for rejection.

## Verification

Default verification does not require real DingTalk credentials:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests\test_im_notifier.py -q
.\.venv\Scripts\ruff.exe check .
```

Live DingTalk delivery should be tested later with a real conversation ID, robot code, published card template, and public callback URL.
