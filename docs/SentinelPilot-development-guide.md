# SentinelPilot Developer Guide

Version: 0.3
Date: 2026-05-22
Status: Executable development guide

SentinelPilot is a security alert response agent platform. It receives alerts from security devices and security platforms, normalizes different alert formats into a unified model, investigates incidents, correlates evidence, manages approvals, generates reports, and evaluates investigation quality.

The initial version uses offline sample data and `MockAlertSource` to validate the core workflow. Later versions use adapters to integrate WAF, IPS, dynamic defense, antivirus, EDR, NDR, SIEM, log audit systems, and vendor security platforms.

## Document Versioning

Use semantic document versions:

- Major version: incompatible architecture, API, or data model change.
- Minor version: new implementation stage, new endpoint, or new adapter family.
- Patch version: wording fixes, clarifications, or non-contractual edits.

Keep this document, `docs/work-allocation-guide.md`, and `docs/development-progress-plan.zh-CN.md` synchronized when a change affects implementation order, API contracts, or milestone tracking.

## Goals

SentinelPilot provides these capabilities:

- Normalize alerts from different security products.
- Investigate alerts with an agent workflow.
- Call tools for log search, threat intelligence lookup, knowledge base search, and MITRE ATT&CK mapping.
- Require human approval for high-risk response actions.
- Generate structured incident reports.
- Evaluate severity, category, tool calls, approval triggers, and report evidence.
- Send DingTalk interactive approval cards, with a webhook markdown fallback.
- Support future integrations with mainstream security vendors in China.

## Non-goals

The initial version does not provide these capabilities:

- Connect to a production network.
- Execute real block, isolate, delete, or disable actions.
- Recreate a full commercial SIEM.
- Implement multi-tenant access control.
- Integrate real vendor APIs.
- Require a real model API for the default local workflow.
- Depend on a public IP address, domain name, or cloud server for the default local workflow.

## Confirmed Decisions

- Project directory: `C:\Users\14378\Documents\Code\SentinelPilot`
- Backend: Python 3.11+, FastAPI, Pydantic v2, SQLite, pytest, Ruff.
- Frontend: Next.js, TypeScript, Tailwind CSS.
- Initial model mode: rules, templates, and mock model.
- Optional model integration: OpenAI-compatible LLM providers can be enabled by environment
  configuration, but tests and the default local workflow must keep working without a real model API.
- Initial data source: `MockAlertSource` and offline sample logs.
- Initial IM integration: DingTalk interactive approval cards; markdown webhook notifications remain a fallback.
- Initial response actions: simulated only.

## Architecture

```text
frontend
  Next.js app
  API client
  investigation workspace
      |
      v
backend
  FastAPI
  Investigation service
  Agent orchestrator
  Tool registry
  Approval service
  Report service
  Eval runner
      |
      v
storage
  SQLite
  local example files
  local knowledge base
```

### Backend Responsibilities

The backend owns:

- Alert ingestion and normalization.
- Investigation state.
- Timeline records.
- Tool execution.
- Approval records.
- Report generation.
- Eval execution.
- IM notifications.

The backend does not execute real response actions in the initial version.

### Frontend Responsibilities

The frontend owns:

- Alert list.
- Alert detail.
- Investigation workspace.
- Timeline display.
- Approval panel.
- Report preview.
- Eval result display.
- IM integration status display.

The frontend must use backend APIs for business data.

## Security Device Adapter Model

All security devices and platforms must implement a common adapter interface.

```text
SecurityDeviceAdapter
  list_alerts()
  get_alert(alert_id)
  normalize(raw_alert)
  get_related_events(alert)
  get_device_metadata()
```

### Adapter Types

Implement adapters in this order:

1. `MockAlertSource`: reads local examples.
2. `SyslogJsonAdapter`: reads common JSON or syslog exports.
3. `WAFAdapter`: handles WAF alerts.
4. `IPSAdapter`: handles IPS and IDS alerts.
5. `AntivirusAdapter`: handles antivirus and endpoint protection alerts.
6. `EDRAdapter`: handles endpoint behavior alerts.
7. `NDRAdapter`: handles network detection and response alerts.
8. `SIEMAdapter`: handles SIEM and situational awareness alerts.
9. `VendorAdapter`: handles vendor-specific API or export formats.

Open-source tool adapters are optional enterprise-roadmap adapters:

- `WazuhAlertSource`: reads Wazuh alerts from an API or exported data.
- `SuricataEveSource`: reads Suricata `eve.json` alerts.

Do not implement `wazuh_source.py` or `suricata_source.py` in the initial version unless a task explicitly asks for open-source tool adapters.

### Supported Product Categories

The adapter layer must support these categories:

- WAF: SQL injection, XSS, webshell upload, command execution, path traversal.
- IPS and IDS: exploit attempts, scans, C2 traffic, lateral movement.
- Dynamic defense and DDoS protection: SYN flood, UDP flood, HTTP flood, CC attack, traffic cleaning.
- Antivirus and endpoint protection: malware detection, quarantine, failed remediation, repeated infection.
- EDR and host security: suspicious process, command line, registry change, file event, host isolation.
- NDR: east-west traffic, abnormal connection, DNS tunnel, C2 callback.
- SIEM and situational awareness: correlated alert, attack stage, asset risk, confidence score.
- Log audit: login log, operation log, database audit, bastion host audit.

### Vendor Roadmap

Future adapters should support these vendors and platforms:

- NSFOCUS: WAF, IPS, vulnerability scanning, situational awareness, anti-DDoS.
- H3C / New H3C: firewall, IPS, log audit, situational awareness, endpoint security.
- Topsec: firewall, WAF, intrusion prevention, log audit, situational awareness.
- Venustech: SOC, situational awareness, intrusion detection, endpoint security.
- Sangfor: AF, EDR, SIP, WAF, cloud security.
- Qi An Xin: Tianyan, NetGod, endpoint security, situational awareness, zero trust.
- DBAPP Security: WAF, situational awareness, database audit, cloud security.
- AsiaInfo Security: antivirus, endpoint security, email security, cloud workload security.
- Hillstone Networks: firewall, IPS, situational awareness.
- DPtech: firewall, application delivery, intrusion prevention.
- Huawei Security, Alibaba Cloud Security, Tencent Cloud Security: cloud WAF, DDoS protection, host security, log services.

## Normalized Data Model

### Alert

```text
id: string
title: string
description: string
source: string
vendor: string | null
product: string | null
device_type: waf | ips | ids | antivirus | edr | ndr | siem | log_audit | mock
severity: low | medium | high | critical
category: string
status: new | investigating | closed
entities: object
time_range: object
raw: object
created_at: datetime
```

`status` is updated by the backend automatically:

- Keep `new` until the first investigation is created for the alert.
- Set to `investigating` when an investigation is created for the alert.
- Set to `closed` when there is no active investigation for the alert and the latest investigation reaches `completed` or `cancelled`.
- Keep `investigating` if any investigation for the alert is still `created`, `running`, or `waiting_approval`.

### Investigation

```text
id: string
alert_id: string
status: created | running | waiting_approval | completed | failed | cancelled
summary: string
severity: low | medium | high | critical
category: string
mitre_techniques: list[string]
error_message: string | null
created_at: datetime
updated_at: datetime
```

Set `error_message` only when `status` is `failed`. It must contain a user-safe error summary, not a Python traceback or prompt text.

### Timeline Item

```text
id: string
investigation_id: string
type: agent_message | tool_call | tool_result | approval_created | approval_decision | report_created | error
title: string
content: string
tool_name: string | null
input: object | null
output: object | null
created_at: datetime
```

### Approval

```text
id: string
investigation_id: string
action_type: block_ip | isolate_host | disable_user | collect_artifact | notify_owner
target: string
risk_level: medium | high | critical
reason: string
status: pending | approved | rejected
comment: string | null
created_at: datetime
decided_at: datetime | null
```

### Report

```text
id: string
investigation_id: string
format: markdown
content: string
created_at: datetime
```

## Investigation State Model

```text
created
  -> running
     -> waiting_approval
        -> running
           -> completed
```

Precise transitions:

| From | To | Trigger |
| --- | --- | --- |
| `created` | `running` | `POST /run` called |
| `running` | `waiting_approval` | `create_approval()` called and the approval blocks final report completion |
| `waiting_approval` | `running` | Approval decision received |
| `running` | `completed` | Orchestrator finishes successfully |
| `running` | `failed` | Unrecoverable error |
| `running` | `cancelled` | User cancels the investigation |
| `waiting_approval` | `cancelled` | User cancels the investigation |

Only `running` and `waiting_approval` investigations can be cancelled. `completed`, `failed`, and `cancelled` investigations are terminal.

## Agent Workflow

The initial version uses a deterministic orchestrator. It does not require a real model API.
When LLM integration is enabled, the model acts as a structured investigation coprocessor after
local evidence collection. It can suggest severity, category, MITRE techniques, summary text, and
recommended response actions. It must not call tools directly or execute real response actions.

```text
1. Load the alert.
2. Search related logs.
3. Look up threat intelligence.
4. Search the knowledge base.
5. Map the behavior to MITRE ATT&CK.
6. Determine severity and category.
6a. Optionally ask the configured LLM for structured analysis and recommended actions.
7. Create approval requests for high-risk actions.
8. Generate the final report.
```

Timeline events are written inline after each step, not in a final batch.
LLM outputs are recorded as `agent_message` timeline events. Output must pass the local Pydantic
schema and guardrail filtering before it can affect an investigation.

Future versions can replace the deterministic orchestrator with LangGraph or OpenAI Agents SDK. The public API and data models should remain stable.

LLM guardrails:

- LLM provider configuration is read from environment variables.
- API keys are never returned by API responses.
- The model must return structured JSON matching the local `LLMAnalysis` schema.
- Recommended actions are filtered by an allowlist.
- `recommend_only` mode records recommendations without creating approval records.
- `approval_required` mode can create approval records for allowed model-recommended actions.
- `auto_approve_simulated` mode can auto-approve simulated actions only.
- Real firewall, EDR, SIEM, or cloud security changes remain disabled until an enterprise response
  integration is explicitly designed and approved.

## Tools

### `get_alert`

Returns alert details by `alert_id`.

Signature:

```text
get_alert(alert_id: string) -> Alert
```

Returns:

- One normalized `Alert`.
- Raises `not_found` when `alert_id` does not exist.

### `search_logs`

Searches local sample logs by time range, host, username, IP, and log type.

Signature:

```text
search_logs(
  time_range: {start: datetime, end: datetime} | null,
  host: string | null,
  username: string | null,
  src_ip: string | null,
  log_type: auth | process | network | dns | null
) -> list[LogEntry]
```

Returns:

- Log entries sorted by event time ascending.
- An empty list when no sample log matches the filters.

### `lookup_threat_intel`

Looks up sample threat intelligence by IP, domain, or file hash.

Signature:

```text
lookup_threat_intel(
  indicator: string,
  indicator_type: ip | domain | hash
) -> ThreatIntelResult
```

Returns:

- `indicator`, `indicator_type`, `reputation`, `labels`, `source`, and `matched_at`.
- `reputation` must be one of `unknown`, `benign`, `suspicious`, or `malicious`.
- `matched_at` is the time when the current tool call matched the indicator against the local threat intelligence dataset. It is not the feed publication time, feed update time, or indicator validity start time.

### `search_knowledge_base`

Searches local Markdown playbooks and incident response guides.

Signature:

```text
search_knowledge_base(
  query: string,
  limit: integer = 5
) -> list[KnowledgeDocument]
```

Returns:

- Matching documents with `id`, `title`, `path`, `snippet`, and `score`.
- At most `limit` results.

### `map_mitre_attack`

Maps alert behavior to MITRE ATT&CK techniques.

Signature:

```text
map_mitre_attack(
  category: string,
  evidence: list[Evidence]
) -> list[MitreTechnique]
```

Returns:

- MITRE technique objects with `technique_id`, `name`, `tactic`, `confidence`, and `reason`.
- An empty list when the behavior cannot be mapped confidently.

The tool consumes semantic evidence text produced by the orchestrator. It must stay a
deterministic keyword matcher and should not infer business semantics from raw fields such as
`event_id`, `logon_type`, vendor-specific field names, or nested device records.

### `create_approval`

Creates an approval request for a high-risk action.

Signature:

```text
create_approval(
  investigation_id: string,
  action_type: block_ip | isolate_host | disable_user | collect_artifact | notify_owner,
  target: string,
  risk_level: medium | high | critical,
  reason: string
) -> Approval
```

Side effects:

- Persists an `Approval` record with `status=pending`.
- Writes an `approval_created` timeline item.
- Moves the investigation to `waiting_approval` when the action blocks final report completion.
- Sends an IM notification when IM notifications are enabled.

### `write_report`

Writes the final Markdown report.

Signature:

```text
write_report(
  investigation_id: string,
  content: string
) -> Report
```

Side effects:

- Persists a `Report` record.
- Writes a `report_created` timeline item.
- Moves the investigation to `completed`.
- Sends an IM notification summary when IM notifications are enabled.

## API Contract

The frontend must use this contract. The backend exposes OpenAPI docs at:

```text
http://localhost:8000/docs
```

### List Alerts

```http
GET /api/alerts
```

Response:

```json
{
  "items": [
    {
      "id": "alert_bruteforce_001",
      "title": "SSH brute force against admin",
      "source": "mock",
      "vendor": null,
      "product": null,
      "device_type": "mock",
      "severity": "medium",
      "category": "authentication",
      "created_at": "2026-05-22T10:00:00Z",
      "status": "new"
    }
  ]
}
```

### Get an Alert

```http
GET /api/alerts/{alert_id}
```

Response:

```json
{
  "id": "alert_bruteforce_001",
  "title": "SSH brute force against admin",
  "description": "Multiple failed SSH logins followed by one successful login.",
  "source": "mock",
  "vendor": null,
  "product": null,
  "device_type": "mock",
  "severity": "medium",
  "status": "new",
  "entities": {
    "src_ip": "203.0.113.10",
    "dst_host": "linux-web-01",
    "username": "admin"
  },
  "time_range": {
    "start": "2026-05-22T09:50:00Z",
    "end": "2026-05-22T10:10:00Z"
  },
  "raw": {}
}
```

### Create an Investigation

```http
POST /api/investigations
Content-Type: application/json
```

Request:

```json
{
  "alert_id": "alert_bruteforce_001"
}
```

Response:

```json
{
  "id": "inv_001",
  "alert_id": "alert_bruteforce_001",
  "status": "created",
  "created_at": "2026-05-22T10:15:00Z"
}
```

This endpoint returns a minimal creation confirmation. It does not return the full investigation object.

Duplicate behavior:

- The backend may create multiple investigations for the same `alert_id`.
- Each request creates a new `investigation_id`.
- The frontend should prevent accidental double-click submissions while the request is in flight.
- To find existing investigations for an alert, add a dedicated query endpoint in a later version instead of making this endpoint idempotent.

After creating an investigation, clients must call:

```http
GET /api/investigations/{investigation_id}
```

### Run an Investigation

```http
POST /api/investigations/{investigation_id}/run
```

This endpoint returns a minimal run acknowledgement. It does not return the full investigation object.

Response:

```json
{
  "id": "inv_001",
  "status": "running"
}
```

After calling this endpoint, clients must poll:

```http
GET /api/investigations/{investigation_id}
GET /api/investigations/{investigation_id}/timeline
```

### Get an Investigation

```http
GET /api/investigations/{investigation_id}
```

Response:

```json
{
  "id": "inv_001",
  "alert_id": "alert_bruteforce_001",
  "status": "waiting_approval",
  "summary": "Possible SSH brute force followed by a successful login.",
  "severity": "high",
  "category": "credential_access",
  "mitre_techniques": ["T1110"],
  "error_message": null,
  "created_at": "2026-05-22T10:15:00Z",
  "updated_at": "2026-05-22T10:16:30Z"
}
```

For `created`, `running`, and `waiting_approval` investigations, `error_message` must be `null`. `summary` can be an empty string before the first analysis summary is produced, and can contain an intermediate summary before the investigation reaches `completed`.

### Get the Timeline

```http
GET /api/investigations/{investigation_id}/timeline
```

Response:

```json
{
  "items": [
    {
      "id": "step_001",
      "type": "tool_call",
      "tool_name": "search_logs",
      "title": "Search authentication logs",
      "input": {
        "src_ip": "203.0.113.10",
        "log_type": "auth"
      },
      "output": {
        "matched_count": 63
      },
      "created_at": "2026-05-22T10:15:10Z"
    }
  ]
}
```

### List Approvals

```http
GET /api/investigations/{investigation_id}/approvals
```

Response:

```json
{
  "items": [
    {
      "id": "appr_001",
      "action_type": "block_ip",
      "target": "203.0.113.10",
      "risk_level": "high",
      "reason": "The IP address generated repeated failed logins and matched threat intelligence.",
      "status": "pending",
      "created_at": "2026-05-22T10:16:00Z"
    }
  ]
}
```

### Decide an Approval

```http
POST /api/approvals/{approval_id}/decision
Content-Type: application/json
```

Request:

```json
{
  "decision": "approved",
  "comment": "The block recommendation is valid."
}
```

Response:

```json
{
  "id": "appr_001",
  "status": "approved"
}
```

This endpoint returns a minimal confirmation. To retrieve the full approval record including `decided_at` and `comment`, call `GET /api/investigations/{investigation_id}/approvals`.

The initial version records a simulated execution result. It does not execute a real block action.

### Get a Report

```http
GET /api/investigations/{investigation_id}/report
```

Response:

```json
{
  "id": "report_001",
  "investigation_id": "inv_001",
  "format": "markdown",
  "content": "# Security Incident Report\n\n## 1. Executive Summary\n...",
  "created_at": "2026-05-22T10:18:00Z"
}
```

### Run Evals

```http
POST /api/evals/run
```

Response:

```json
{
  "run_id": "eval_001",
  "status": "completed",
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  }
}
```

### Get an Eval Run

```http
GET /api/evals/{run_id}
```

Response:

```json
{
  "run_id": "eval_001",
  "status": "completed",
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  },
  "cases": [
    {
      "case_id": "eval_bruteforce_001",
      "passed": true,
      "scores": {
        "severity_match": true,
        "category_match": true,
        "mitre_match": true,
        "tool_call_match": true,
        "approval_match": true,
        "report_evidence_match": true
      },
      "notes": []
    }
  ]
}
```

Eval case rules:

- `passed` is `true` only when every required score in `scores` is `true`.
- `passed` is `false` when any required score is `false`.
- `notes` contains human-readable explanations for failed or skipped checks.
- `notes` must be an empty array when the case passes without warnings.
- Optional warning notes may be included only when they do not affect `passed`.

### Get IM Status

```http
GET /api/integrations/im/status
```

Response:

```json
{
  "enabled": true,
  "provider": "dingtalk",
  "notification_only": false,
  "callback_enabled": true,
  "card_enabled": true,
  "last_error": null
}
```

### Get LLM Status

```http
GET /api/integrations/llm/status
```

Response:

```json
{
  "enabled": false,
  "provider": "mock",
  "model": "",
  "base_url_configured": false,
  "api_key_configured": false,
  "prompt_profile": "default",
  "temperature": 0.2,
  "timeout_seconds": 30,
  "action_mode": "approval_required",
  "constraints": {
    "structured_output_required": true,
    "allowed_actions": ["block_ip", "isolate_host", "disable_user", "collect_artifact", "notify_owner"],
    "action_mode": "approval_required",
    "high_risk_actions_allowed": true,
    "high_risk_requires_approval": true,
    "real_response_actions_enabled": false,
    "secrets_hidden": true
  },
  "supported_providers": ["mock", "openai_compatible"],
  "supported_action_modes": ["recommend_only", "approval_required", "auto_approve_simulated"]
}
```

This endpoint returns a sanitized configuration view. It must not include API keys or raw secrets.

### Send a Test IM Notification

```http
POST /api/integrations/im/test
```

Response:

```json
{
  "ok": true,
  "provider": "dingtalk",
  "message": "Test notification sent."
}
```

### Handle DingTalk Card Callback

```http
POST /api/integrations/im/dingtalk/card-callback
```

DingTalk calls this endpoint when a user clicks an approval or rejection button on an interactive card.
The backend validates `x-ddpaas-signature-timestamp` and `x-ddpaas-signature` against
`DINGTALK_CARD_CALLBACK_SECRET`, then records the approval decision through the same approval service
used by the frontend.

Request:

```json
{
  "type": "actionCallback",
  "outTrackId": "appr_001",
  "userId": "manager001",
  "content": "{\"cardPrivateData\":{\"params\":{\"approval_id\":\"appr_001\",\"decision\":\"approved\"}}}"
}
```

Response:

```json
{
  "ok": true,
  "approval_id": "appr_001",
  "status": "approved",
  "cardData": {
    "cardParamMap": {
      "approval_id": "appr_001",
      "approval_status": "approved",
      "approval_comment": "DingTalk card action by manager001."
    }
  }
}
```

## Repository Layout

```text
sentinel-pilot/
  README.md
  LICENSE
  .gitignore
  .env.example
  docker-compose.yml
  backend/
    pyproject.toml
    sentinel_pilot/
      __init__.py
      main.py
      config.py
      api/
        routes_alerts.py
        routes_investigations.py
        routes_approvals.py
        routes_evals.py
        routes_integrations.py
        schemas.py
      core/
        models.py
        states.py
        errors.py
      services/
        investigation_service.py
        approval_service.py
        report_service.py
        trace_service.py
      agent/
        orchestrator.py
        prompts.py
        tools.py
        tool_registry.py
      adapters/
        base.py
        mock_source.py
        syslog_json_source.py
        waf_source.py
        ips_source.py
        antivirus_source.py
        edr_source.py
        ndr_source.py
        siem_source.py
        vendor_source.py
        wazuh_source.py        # roadmap only
        suricata_source.py     # roadmap only
      integrations/
        im/
          base.py
          dingtalk.py
          notifier.py
      storage/
        database.py
        repositories.py
      evals/
        runner.py
        graders.py
    tests/
      test_health.py
      test_alerts_api.py
      test_repositories.py
      test_investigation_api.py
      test_tools.py
      test_investigation_flow.py
      test_approvals.py
      test_report_service.py
      test_evals.py
      test_im_notifier.py
  frontend/
  examples/
    alerts/
    logs/
    threat_intel/
  knowledge_base/
    playbooks/
    response_guides/
    mitre_notes/
  evals/
    datasets/
  docs/
```

### Knowledge Base Layout

Use this structure for local knowledge base files:

```text
knowledge_base/
  playbooks/
    ssh-bruteforce.md
    suspicious-powershell.md
    webshell-upload.md
  response_guides/
    account-compromise.md
    host-isolation.md
    ip-blocking.md
  mitre_notes/
    T1110.md
    T1059.001.md
```

## Example Scenarios

Implement these scenarios in the initial version:

| Scenario | Expected result |
| --- | --- |
| SSH brute force | Map to `T1110`, require IP block approval |
| Suspicious PowerShell | Map to `T1059.001`, require host isolation approval |
| Webshell upload | Identify web intrusion, recommend evidence preservation |
| Malicious domain access | Identify risky DNS or HTTP behavior |
| Lateral movement | Identify multi-host login pattern |
| Low-risk false positive | Lower severity and explain why |

## Development Standards

### Backend

- Use Pydantic models for all API requests and responses.
- Keep API handlers thin.
- Put business logic in `services/`.
- Put deterministic tools in `agent/tools.py` or focused modules.
- Put adapter logic in `adapters/`.
- Make tool outputs deterministic.
- Write tests for adapters, tools, repositories, services, and APIs.

### Frontend

- Use backend APIs for business data.
- Keep API calls in a shared client.
- Match API response field names exactly.
- Render Markdown reports safely.
- Poll running investigations every 2 seconds.
- Stop polling when the status is `waiting_approval`, `completed`, `failed`, or `cancelled`.
- Keep the UI efficient, elegant, and information-dense.

### Security

- Do not commit `.env`.
- Do not commit real API keys.
- Do not commit real webhook URLs.
- Do not commit customer data.
- Do not expose an arbitrary command execution endpoint.
- Validate IM webhook signatures when callback support is added.
- Keep all initial-version response actions simulated.

## Build the Initial Version

### Step 1: Create the Backend Skeleton

Create:

```text
backend/pyproject.toml
backend/sentinel_pilot/main.py
backend/sentinel_pilot/config.py
backend/tests/test_health.py
```

Create and activate a virtual environment on Windows:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Implement:

- FastAPI app.
- `GET /health`.
- pytest.
- Ruff.
- `.env.example`.

Verify:

```powershell
pytest
uvicorn sentinel_pilot.main:app --reload
```

Expected health response:

```json
{"status":"ok"}
```

### Step 2: Add Sample Data

Create:

```text
examples/alerts/
examples/logs/
examples/threat_intel/
knowledge_base/
evals/datasets/
```

Add at least six scenarios from the example scenario table.

Verify:

- Each alert parses into the `Alert` model.
- Each alert has related logs.
- Each eval case references an existing alert.

### Step 3: Implement Adapters

Create:

```text
backend/sentinel_pilot/adapters/base.py
backend/sentinel_pilot/adapters/mock_source.py
```

Implement:

- Common adapter protocol.
- `MockAlertSource`.
- Alert normalization tests.

Verify:

- `MockAlertSource.list_alerts()` returns sample alerts.
- `MockAlertSource.get_alert()` returns one alert by ID.
- Invalid alert IDs return a typed error.

### Step 4: Implement Alert APIs

Create:

```text
backend/sentinel_pilot/api/routes_alerts.py
backend/sentinel_pilot/api/schemas.py
backend/tests/test_alerts_api.py
```

Implement:

- `GET /api/alerts`
- `GET /api/alerts/{alert_id}`

Verify:

- The list endpoint returns sample alerts.
- The detail endpoint returns normalized fields.
- Unknown alert IDs return the standard error response.

### Step 5: Implement Storage

Create:

```text
backend/sentinel_pilot/storage/database.py
backend/sentinel_pilot/storage/repositories.py
backend/tests/test_repositories.py
```

Implement:

- SQLite initialization.
- Investigation repository.
- Timeline repository.
- Approval repository.
- Report repository.

Verify:

- Created records can be read back.
- Timeline events are ordered by creation time.
- Tests use isolated temporary databases.

### Step 6: Implement Investigation APIs

Create:

```text
backend/sentinel_pilot/services/investigation_service.py
backend/sentinel_pilot/services/trace_service.py
backend/sentinel_pilot/api/routes_investigations.py
backend/tests/test_investigation_api.py
```

Implement:

- `POST /api/investigations`
- `GET /api/investigations/{investigation_id}`
- `GET /api/investigations/{investigation_id}/timeline`

Verify:

- New investigations start in `created`.
- The timeline is available immediately.
- Missing investigations return the standard error response.

### Step 7: Implement Tools

Create:

```text
backend/sentinel_pilot/agent/tools.py
backend/sentinel_pilot/agent/tool_registry.py
backend/tests/test_tools.py
```

Implement the tools listed in the Tools section.

Verify:

- `search_logs` finds failed SSH login records.
- `lookup_threat_intel` returns sample IP reputation.
- `map_mitre_attack` maps brute force behavior to `T1110`.
- Tool calls are written to the timeline.

### Step 8: Implement the Orchestrator

Create:

```text
backend/sentinel_pilot/agent/orchestrator.py
backend/tests/test_investigation_flow.py
```

Implement the deterministic workflow from the Agent workflow section.

When constructing evidence for `map_mitre_attack`, translate structured logs into clear semantic
text before calling the tool. For example, Windows `event_id=4624` with `logon_type=3` should be
represented as `Network logon`, and lateral movement evidence should include phrases such as
`SMB share` and `Remote WMI connection` when those patterns are present. The orchestrator owns this
semantic normalization; `map_mitre_attack` should not parse raw event fields directly.

Verify:

- The brute force scenario reaches `waiting_approval` or `completed`.
- The timeline contains tool calls.
- The result contains severity, category, and MITRE techniques.

### Step 9: Implement Approvals

Create:

```text
backend/sentinel_pilot/services/approval_service.py
backend/sentinel_pilot/api/routes_approvals.py
backend/tests/test_approvals.py
```

Implement:

- `GET /api/investigations/{investigation_id}/approvals`
- `POST /api/approvals/{approval_id}/decision`

Verify:

- High-risk actions create approval records.
- Approvals are idempotent.
- Approval decisions are written to the timeline.

### Step 10: Implement Reports

Create:

```text
backend/sentinel_pilot/services/report_service.py
backend/tests/test_report_service.py
```

Report sections:

```text
1. Executive summary
2. Alert details
3. Investigation steps
4. Evidence chain
5. MITRE ATT&CK mapping
6. Impact assessment
7. Response recommendations
8. Approval history
9. Hardening recommendations
```

Verify:

- The report is Markdown.
- The report references evidence IDs.
- The report does not contain prompts, secrets, or stack traces.

### Step 11: Implement Evals

Create:

```text
backend/sentinel_pilot/evals/runner.py
backend/sentinel_pilot/evals/graders.py
backend/tests/test_evals.py
```

Eval checks:

- Severity match.
- Category match.
- MITRE match.
- Required tools called.
- Approval required when expected.
- Report contains evidence.

Verify:

```powershell
python -m sentinel_pilot.evals.runner
```

Expected output:

```text
Total: 6
Passed: 6
Failed: 0
```

### Step 12: Build the Frontend

Create pages:

```text
/alerts
/alerts/[id]
/investigations/[id]
/evals
```

Create components:

```text
AlertList
AlertDetail
InvestigationTimeline
ToolCallCard
ApprovalPanel
SeverityBadge
MitreTechniqueList
ReportPreview
EvalSummary
IMStatus
```

Verify:

- Users can start an investigation from an alert.
- Users can see timeline events.
- Users can approve or reject high-risk actions.
- Users can read the final report.
- Users can run evals.
- Users can see whether DingTalk notifications are enabled.

### Step 13: Implement DingTalk Notifications

Create:

```text
backend/sentinel_pilot/integrations/im/base.py
backend/sentinel_pilot/integrations/im/dingtalk.py
backend/sentinel_pilot/integrations/im/notifier.py
backend/sentinel_pilot/api/routes_integrations.py
backend/tests/test_im_notifier.py
```

Configuration:

```env
IM_PROVIDER=dingtalk
IM_NOTIFICATION_ENABLED=false

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

# Optional LLM integration.
LLM_ENABLED=false
LLM_PROVIDER=mock
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
LLM_TEMPERATURE=0.2
LLM_TIMEOUT_SECONDS=30
LLM_PROMPT_PROFILE=default
LLM_ACTION_MODE=approval_required
LLM_ALLOW_HIGH_RISK_ACTIONS=true
```

`PUBLIC_APP_URL` is the frontend base URL used in DingTalk messages. Notification links should point to investigation pages, approval panels, or reports under this URL.
Real DingTalk button callbacks require `DINGTALK_CARD_CALLBACK_URL` to be reachable by DingTalk.

Verify:

- Missing webhook config does not fail the app.
- The test endpoint sends a message when webhook config is present.
- Approval creation sends an interactive card when card config is present.
- DingTalk card callback validates the callback signature and records the approval decision.
- Investigation completion sends a summary.

### Step 14: Add Docker and Release Docs

Create:

```text
Dockerfile
docker-compose.yml
README.md
docs/architecture.md
docs/api-contract.md
docs/eval-report.md
docs/im-integration.md
```

Verify:

```powershell
docker compose up
```

Then open:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/docs
```

## Enterprise Rollout

The enterprise rollout has five phases.

### Phase 1: Initial Implementation

Goal: Run the platform locally with offline data.

Scope:

- `MockAlertSource`
- Offline logs
- SQLite
- Deterministic orchestrator
- Local frontend
- Eval runner
- DingTalk interactive approval cards, with notification-only fallback

Exit criteria:

- The initial version starts with one command.
- Six sample scenarios pass evals.
- The API contract is stable.

### Phase 2: Standard Ingestion

Goal: Import alerts from common enterprise formats.

Scope:

- JSON export adapter.
- Syslog adapter.
- CSV import adapter.
- File drop ingestion.
- Basic API polling adapter.
- Alert deduplication.
- Alert normalization report.

Exit criteria:

- At least three non-mock input formats map to the normalized Alert model.
- Invalid records produce actionable errors.
- The adapter test suite covers field mapping and severity mapping.

### Phase 3: Device and Vendor Integration

Goal: Connect real security products without changing the Agent workflow.

Scope:

- WAF adapter.
- IPS adapter.
- Antivirus adapter.
- EDR adapter.
- SIEM adapter.
- Vendor-specific adapters for selected domestic brands.
- Adapter capability metadata.

Exit criteria:

- Each adapter declares supported fields, missing fields, and confidence.
- Each adapter ships with sample raw alerts and normalization tests.
- The investigation workflow runs on normalized alerts from at least two real product categories.

### Phase 4: Enterprise Deployment

Goal: Run the system in a controlled enterprise environment.

Recommended architecture:

```text
load balancer
  -> frontend service
  -> backend API service
  -> worker service
  -> PostgreSQL
  -> Redis
  -> object storage
  -> vector store
  -> log and metrics stack
```

Required capabilities:

- PostgreSQL instead of SQLite.
- Background workers for long-running investigations.
- Redis or equivalent queue backend.
- SSO or OIDC login.
- RBAC for viewer, analyst, approver, and admin roles.
- Audit logs for every approval and configuration change.
- TLS termination.
- Secrets management.
- Backup and restore.
- Health checks and readiness checks.
- Metrics, logs, and traces.

Exit criteria:

- A test deployment survives service restart.
- Investigation state is not lost.
- Approval records are auditable.
- Secrets are not stored in plaintext config files.
- Operations teams can monitor queue length, error rate, and investigation latency.

### Phase 5: Production Operations

Goal: Operate the product as part of a security operations workflow.

Required capabilities:

- Device onboarding workflow.
- Adapter validation before activation.
- Asset inventory enrichment.
- Case assignment.
- SLA tracking.
- Playbook versioning.
- Analyst feedback collection.
- Eval regression suite.
- False positive tuning.
- Model output review.
- IM callback approval with signature validation.
- Change management for response actions.

Exit criteria:

- New devices can be onboarded without code changes when they use a supported format.
- Vendor adapters can be released independently.
- Evals run before playbook or prompt changes are promoted.
- High-risk actions require approval and produce immutable audit logs.

## Operational Requirements

### Reliability

- Persist investigation state before and after each tool call.
- Make approval decisions idempotent.
- Retry transient IM notification failures.
- Record failed tool calls in the timeline.
- Keep eval tests independent of external APIs.

### Security

- Store secrets outside the repository.
- Redact secrets from logs and timeline records.
- Validate all callback signatures.
- Use least-privilege credentials for device APIs.
- Separate read-only investigation tools from response tools.

### Observability

Collect:

- Investigation count.
- Investigation latency.
- Tool call latency.
- Tool call failure rate.
- Approval wait time.
- Eval pass rate.
- IM notification failure rate.

### Governance

Track:

- Adapter version.
- Playbook version.
- Eval dataset version.
- Approval policy version.
- Report template version.

## Quality Checklist

Before merging a stage, verify:

- The stage exit criteria pass.
- API fields match the API contract.
- Tests run without real model APIs.
- Default LLM tests use the mock provider or local fakes only.
- Tests run without real security devices.
- Tests run without IM webhook configuration.
- No real secret is committed.
- No real customer or device data is committed.
- High-risk actions remain simulated unless enterprise response integration is explicitly enabled.
- Documentation matches the implementation.

## References

- Google developer documentation style guide: https://developers.google.com/style
- Google headings and titles guidance: https://developers.google.com/style/headings
- Google procedures guidance: https://developers.google.com/style/procedures
- OpenAI Agents SDK: https://platform.openai.com/docs/guides/agents-sdk
- OpenAI Agent Evals: https://platform.openai.com/docs/guides/agent-evals
- LangGraph documentation: https://langchain-ai.github.io/langgraph/
- Wazuh documentation: https://documentation.wazuh.com/current/getting-started/index.html
- Suricata documentation: https://docs.suricata.io/en/
- Zeek documentation: https://docs.zeek.org/en/
