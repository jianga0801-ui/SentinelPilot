# API Contract

The backend exposes local REST APIs under `/api`. Interactive OpenAPI documentation is available at `/docs` when the backend is running.

The desktop sidecar also exposes `GET /health` at the service root so the Tauri main process can verify that the dynamically assigned backend port is ready.

## Health

### `GET /health`

Returns the local backend health status.

## Alerts

### `GET /api/alerts`

Returns normalized alert list items from the current alert source. The local source includes the canonical examples plus deterministic expanded samples.

### `GET /api/alerts/{alert_id}`

Returns one normalized alert with raw payload and entities.

## Investigations

### `POST /api/investigations`

Payload:

```json
{"alert_id": "alert_bruteforce_001"}
```

Creates an investigation in `created` state.

### `POST /api/investigations/{investigation_id}/run`

Starts the deterministic orchestrator in the background.

### `GET /api/investigations/{investigation_id}`

Returns the current investigation state, severity, category, MITRE techniques, and error summary if failed.

### `GET /api/investigations/{investigation_id}/timeline`

Returns the append-only investigation timeline.

## Approvals

### `GET /api/investigations/{investigation_id}/approvals`

Lists approval records for an investigation.

### `POST /api/approvals/{approval_id}/decision`

Payload:

```json
{"decision": "approved", "comment": "Verified malicious source."}
```

Records a human decision. The API does not execute real response actions.

## Reports

### `GET /api/investigations/{investigation_id}/report`

Returns or creates the Markdown incident report for a completed investigation.

## Settings

### `GET /api/settings`

Returns editable runtime configuration. Sensitive values return `value: null` plus `configured`.

### `PATCH /api/settings`

Payload:

```json
{
  "items": {
    "im_provider": "feishu",
    "feishu_webhook_url": "https://open.feishu.cn/open-apis/bot/v2/hook/..."
  }
}
```

Updates allowed local settings, reloads runtime dependencies, and returns the same masked response shape.

### `GET /api/settings/status`

Returns editable and sensitive key metadata.

## Logs And Dashboard

### `GET /api/logs/security`

Filters local JSONL security telemetry. Supported filters:

- `alert_id`
- `host`
- `username`
- `src_ip`
- `event_type`
- `severity`
- `start_time`
- `end_time`
- `limit`

### `GET /api/system/dashboard`

Returns health state, alert metrics, investigation counts, pending approvals, recent timeline items, and high-risk alerts.

### `GET /api/system/health`

Returns backend, database, LLM, and notification-channel status.

### `GET /api/system/logs/service`

Reads local service logs when `logs/app.log` exists. Missing files return an empty list.

## IM Integrations

### `GET /api/integrations/im/status`

Returns provider status for DingTalk, Feishu, or WeCom.

### `POST /api/integrations/im/test`

Attempts to send a robot notification when enabled and configured.

### `POST /api/integrations/im/dingtalk/card-callback`

Receives DingTalk interactive card decisions, validates callback signature headers, and records the approval decision.

## Evals

### `POST /api/evals/run`

Runs the baseline deterministic evaluation suite.

### `GET /api/evals/{run_id}`

Returns one evaluation run result.
