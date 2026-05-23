# SentinelPilot

SentinelPilot is an automated security alert response and investigation Agent platform. It receives alerts from various security devices, normalizes them into a unified format, orchestrates investigation workflows using AI and security tools, manages human-in-the-loop approvals, and generates comprehensive Markdown incident reports.

## Features

- **Alert Normalization**: Standardizes alerts from WAF, IPS, EDR, NDR, SIEM, etc.
- **Automated Investigation**: Uses deterministic playbooks and Agent tools (log search, threat intel lookup, MITRE ATT&CK mapping).
- **Human-in-the-Loop Approvals**: High-risk response actions (e.g., blocking an IP, isolating a host) are paused until approved.
- **Markdown Incident Reports**: Generates professional, academic-grade security incident reports.
- **Eval Runner**: Built-in automated evaluation system to continuously grade the agent's analytical capabilities across multiple cyber-attack scenarios.
- **IM Integration**: DingTalk interactive approval cards with webhook fallback.

## Technology Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLite
- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Orchestration**: Custom deterministic Agent workflow
- **Deployment**: Local development first; Docker Compose is optional.

## Quick Start (Local)

The primary development path runs the backend and frontend directly on the host.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
uvicorn sentinel_pilot.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

- **Frontend Workspace**: `http://localhost:3000`
- **Backend API & Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

## Verification

Run these before publishing changes:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check .
```

```powershell
cd frontend
npm run lint
npm run build
```

## Optional Docker

```bash
docker compose up -d --build
```

Docker uses local sample data and a named SQLite data volume. It is useful for release smoke tests, but local startup is the main path.

## DingTalk Configuration

Interactive cards require DingTalk app credentials, a robot code, an open conversation ID, a published card template ID, and a callback URL reachable by DingTalk. Keep those values in local `.env` only; `.env.example` contains placeholders.

## Documentation

- [Architecture Guide](docs/architecture.md)
- [API Contract](docs/api-contract.md)
- [Eval Report & Testing](docs/eval-report.md)
- [IM Integration](docs/im-integration.md)
- [Development Progress Plan](docs/development-progress-plan.zh-CN.md)
