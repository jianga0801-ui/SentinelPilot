# API Contract

The SentinelPilot backend provides a RESTful API. Below are the key endpoints used by the frontend and external integrations. For interactive documentation, visit `/docs` on the backend server.

## 1. Alerts

### `GET /api/alerts`
Retrieves a list of all normalized alerts available from the current security device adapter.

### `GET /api/alerts/{alert_id}`
Retrieves detailed information for a specific alert, including its original raw payload and normalized entities.

## 2. Investigations

### `POST /api/investigations`
Creates a new investigation for a given `alert_id`.
- **Payload**: `{"alert_id": "string"}`
- **Returns**: `{"id": "inv_123", "status": "created", ...}`

### `POST /api/investigations/{investigation_id}/run`
Triggers the Orchestrator to begin asynchronous processing.
- **Returns**: `{"id": "inv_123", "status": "running"}`

### `GET /api/investigations/{investigation_id}`
Retrieves the current state, dynamic severity, and category of the investigation. Polled by the frontend to detect state transitions (e.g., entering `waiting_approval`).

### `GET /api/investigations/{investigation_id}/timeline`
Retrieves the immutable chronological ledger of steps, tool executions, and findings generated during the investigation.

## 3. Approvals

### `GET /api/investigations/{investigation_id}/approvals`
Lists all approval requests generated for the investigation.

### `POST /api/approvals/{approval_id}/decision`
Submits a human SOC decision (approve or reject) for a pending high-risk action.
- **Payload**: `{"decision": "approved", "comment": "Verified IP address is malicious."}`

## 4. Reports

### `GET /api/investigations/{investigation_id}/report`
Retrieves the final finalized Markdown incident report. This endpoint returns an error if the investigation has not reached the `completed` state.

## 5. Evals

### `POST /api/evals/run`
Executes the automated Eval Runner against the baseline dataset.
- **Returns**: `{"run_id": "eval_123", ...}`

### `GET /api/evals/{run_id}`
Retrieves the grading results of a specific evaluation run, including detailed scorecards for severity match, MITRE match, and tool execution.

## 6. IM Integrations

### `GET /api/integrations/im/status`
Returns the configured IM provider and capability flags, including whether DingTalk interactive cards and callbacks are enabled.

### `POST /api/integrations/im/test`
Attempts to send a test notification through the configured provider. Disabled or incomplete configuration must not break the application.

### `POST /api/integrations/im/dingtalk/card-callback`
Receives DingTalk interactive card button callbacks. The backend validates DingTalk callback signature headers and records the approval decision through the same approval workflow used by the frontend.
