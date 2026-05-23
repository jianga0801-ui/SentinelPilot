# AGENTS.md

This file defines rules for agents working in this repository. Follow these rules before making changes.

## Project Context

SentinelPilot is a security alert response agent platform. It normalizes alerts from security devices and platforms, investigates alerts with an agent workflow, records evidence, requires approval for high-risk actions, generates reports, and evaluates investigation quality.

Use these documents as project references:

- `docs/SentinelPilot-development-guide.md`: source of truth for technical requirements, architecture, API contract, data models, implementation steps, rollout, and quality checks.
- `docs/development-progress-plan.zh-CN.md`: progress tracker for the project owner. Update it whenever development pauses, resumes, completes a milestone, or hits a blocker.
- `docs/work-allocation-guide.md`: task allocation reference for the project owner.

## Language Rules

- Keep `docs/SentinelPilot-development-guide.md` in English.
- Keep owner-facing tracking and allocation documents in Chinese unless the user requests otherwise.
- Code, comments, API field names, commit messages, and technical identifiers should be English.
- Do not mix Chinese and English in the same formal project document unless a brand name or external term requires it.

## Safety Rules

Follow the user's global safety rules when they are present. This section adds repository-specific reminders:

- Do not use forceful recursive deletion commands such as `Remove-Item -Recurse -Force`, `del /S /Q`, or `rm -rf`.
- Prefer moving files to the Recycle Bin on Windows.
- Before deletion, list the exact target paths and ask for confirmation.
- Before any operation that can cause data loss, explain the operation and wait for confirmation.
- Before modifying configuration files, create a timestamped backup.
- Before text replacement, verify the intended change.

## Secrets and Sensitive Data

- Do not commit `.env`.
- Do not commit real API keys.
- Do not commit real webhook URLs.
- Do not commit customer data.
- Do not commit real security device data.
- Do not commit personal documents, resumes, photos, or unrelated local files.
- Use `.env.example` for configuration examples.
- Redact secrets from logs, reports, traces, timeline records, screenshots, and documentation.

## Response Action Safety

- The initial version must not execute real response actions.
- High-risk actions must create approval records or simulated execution records only.
- Treat these as high-risk actions:
  - Blocking an IP address.
  - Isolating a host.
  - Disabling a user account.
  - Deleting files.
  - Killing processes.
  - Changing firewall, WAF, IPS, EDR, SIEM, or cloud security policies.
- Do not add code paths that execute real response actions unless the user explicitly requests enterprise response integration and approves the safety design.

## Karpathy-Style Coding Principles

These guidelines favor caution over speed. Use judgment for trivial tasks.

### 1. Think Before Coding

Do not assume. Do not hide confusion. Present trade-offs.

Before implementation:

- State your assumptions.
- If you are unsure, ask instead of guessing.
- If there are multiple interpretations, present them.
- If there is a simpler approach, mention it.
- If something is unclear, stop and ask.

### 2. Prefer Simplicity

Solve the problem with the least code that satisfies the requirement.

- Do not add features that were not requested.
- Do not create abstractions for one-off code.
- Do not add unrequested flexibility or configurability.
- Do not add defensive handling for impossible cases.
- If 200 lines can be 50 lines without losing clarity, rewrite it.

Ask: would a senior engineer think this is over-engineered? If yes, simplify.

### 3. Make Precise Changes

Touch only what is necessary. Clean up only the mess you create.

When editing existing code:

- Do not improve adjacent code, comments, or formatting unless required.
- Do not refactor code that is not part of the task.
- Match the existing style, even if you prefer a different style.
- If you notice unrelated dead code, mention it; do not remove it.

When your change creates orphaned code:

- Remove imports, variables, or functions made unused by your change.
- Do not remove pre-existing dead code unless asked.

Test: every changed line should trace directly to the user request.

### 4. Execute Toward Verifiable Goals

Define success criteria. Loop until they pass.

Convert tasks into verifiable goals:

- "Add validation" means write tests for invalid input, then make them pass.
- "Fix a bug" means reproduce it with a test, then make it pass.
- "Refactor X" means verify behavior before and after the refactor.

For multi-step work, state a short plan:

```text
1. [Step] -> Verify: [check]
2. [Step] -> Verify: [check]
3. [Step] -> Verify: [check]
```

Strong success criteria allow independent execution. Weak criteria such as "make it work" require clarification.

## Development Workflow

1. Read the relevant section of `docs/SentinelPilot-development-guide.md`.
2. Check `docs/development-progress-plan.zh-CN.md` for the current milestone and next step.
3. State assumptions and the planned verification.
4. Implement the smallest change that satisfies the current task.
5. Run the relevant tests or checks.
6. Update documentation if the API contract, data model, architecture, configuration, or progress changes.
7. Update `docs/development-progress-plan.zh-CN.md` before pausing.

## Progress Tracking Rules

Update `docs/development-progress-plan.zh-CN.md` when:

- Development starts on a milestone.
- A milestone is completed.
- Work pauses.
- Work resumes after a pause.
- A blocker appears.
- The API contract changes.
- The data model changes.
- The implementation order changes.
- A requirement changes.

Each progress update must include:

- Current milestone.
- Completed work.
- Modified files.
- Validation commands and results.
- Current blockers.
- Next step.
- Questions that need user confirmation.

## API and Data Model Rules

- The API contract in `docs/SentinelPilot-development-guide.md` is authoritative.
- If an API changes, update:
  - The API Contract section.
  - Backend API tests.
  - Frontend API types.
- Keep API responses stable once frontend integration starts.
- Use Pydantic models for backend request and response schemas.
- Use ISO 8601 UTC timestamps.
- Return structured errors.

## Frontend Rules

- Use backend APIs for business data.
- Mock data is allowed only before APIs are ready.
- Mock field names must match the API contract.
- Do not implement business decisions only in the frontend.
- Approval actions must call backend APIs.
- Keep the UI elegant, efficient, and information-dense.
- Do not build a marketing landing page as the primary interface.

## Backend Rules

- Keep API handlers thin.
- Put business logic in services.
- Put adapter logic in `adapters/`.
- Put deterministic tool logic in `agent/tools.py` or focused tool modules.
- Make tests independent of real model APIs.
- Make tests independent of real security devices.
- Make tests independent of DingTalk webhook configuration.

## Adapter Rules

- All device integrations must implement the shared `SecurityDeviceAdapter` interface.
- Normalize raw alerts into the internal `Alert` model.
- Preserve the original raw alert in `raw`.
- Include vendor, product, and device type when available.
- Adapter tests must cover:
  - Field mapping.
  - Severity mapping.
  - Missing fields.
  - Invalid records.
  - Related event lookup.

## Testing Rules

- Add or update tests for each behavior change.
- Prefer deterministic tests.
- Do not require external services for default test runs.
- Test high-risk action behavior with simulated actions only.
- If a test cannot run, document why and what remains unverified.

## Documentation Rules

- Keep the main developer guide concise, accurate, and executable.
- Do not add interview notes, resume wording, or personal planning content to the main developer guide.
- Put owner-facing planning content in Chinese tracking or allocation documents.
- Put developer-facing technical requirements in the English developer guide.
- Update docs in the same change when behavior, APIs, architecture, or commands change.

## Git Rules

- Do not revert user changes unless explicitly asked.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --` without explicit confirmation.
- Keep commits focused when commits are requested.
- Do not commit generated secrets, local databases, logs, or build artifacts.

## Stop Conditions

Stop and ask for clarification when:

- A requirement conflicts with the main developer guide.
- A change requires real response actions.
- A change requires real vendor credentials or production data.
- A destructive operation is needed.
- Multiple interpretations would lead to different architecture or API changes.

When a stop condition is met:

1. Do not modify files.
2. State the exact blocker.
3. List the decision or confirmation needed.
4. Suggest the safest next action.
5. Update `docs/development-progress-plan.zh-CN.md` if work is being paused.
