# Eval Report & Testing Framework

SentinelPilot ships with an integrated Eval Runner (`sentinel_pilot/evals`) designed to autonomously measure the effectiveness and accuracy of the Agent Orchestrator.

## The Purpose of Evals

As the intelligence layer of the application evolves—whether through updated deterministic playbooks, new LangChain/LangGraph flows, or LLM prompt adjustments—the Eval Runner ensures that the agent consistently reaches the correct security conclusions.

## Eval Cases

The platform evaluates the Agent against 6 baseline offline scenarios defined in `evals/datasets/initial_cases.json`:
1. SSH Brute Force (T1110)
2. Suspicious PowerShell (T1059.001)
3. Webshell Upload (T1505.003)
4. Malicious Domain Access (T1071.001)
5. Lateral Movement (T1021.002, T1021.006)
6. Low-risk False Positive

## Grading Criteria (The "Graders")

For a case to pass, the Eval Runner executes the investigation from start to finish and scores it across 6 critical dimensions:

- **`severity_match`**: The Agent dynamically calculated the correct severity (e.g., escalating a `medium` alert to `high` based on log evidence).
- **`category_match`**: The Agent properly categorized the threat (e.g., `credential_access`).
- **`mitre_match`**: The Agent accurately mapped the behavior to the precise MITRE ATT&CK technique IDs using evidence text.
- **`tool_call_match`**: The Agent invoked the necessary tools (e.g., `search_logs`, `lookup_threat_intel`) during its run.
- **`approval_match`**: The Agent correctly determined whether a high-risk action required human-in-the-loop approval.
- **`report_evidence_match`**: The Agent successfully attached the correlated timeline evidence directly into the final Markdown report.

## Running Evals

To execute the evals locally in the terminal:

```bash
cd backend
python -m sentinel_pilot.evals.runner
```

Alternatively, you can trigger the evaluation from the Next.js frontend by navigating to the **Evals Dashboard** (`/evals`). This initiates a full API-driven eval run, providing a highly-detailed, visual scorecard for each scenario.
