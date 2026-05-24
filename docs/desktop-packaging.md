# Desktop Packaging

SentinelPilot ships as a Tauri desktop application. The desktop runtime keeps the existing FastAPI backend and Next.js UI, but removes the need for users to run Python, Node.js, or a terminal.

## Runtime Shape

```text
SentinelPilot desktop app
  Tauri Rust main process
    starts Python FastAPI sidecar on a free local port
    exposes backend_base_url to the WebView
    stops the sidecar process tree when the window closes
  WebView
    loads frontend/out static files
    calls the backend over local HTTP
  User data directory
    stores SQLite database and service logs
```

## Build Commands

Windows:

```powershell
.\scripts\build-desktop.ps1
```

Linux:

```bash
bash scripts/build-desktop.sh
```

The backend sidecar name follows Tauri's platform suffix convention:

```text
frontend/src-tauri/binaries/sentinel-pilot-backend-x86_64-pc-windows-msvc.exe
frontend/src-tauri/binaries/sentinel-pilot-backend-x86_64-unknown-linux-gnu
```

Generated binaries and installer outputs are build artifacts and are not source files.

## Backend Desktop Contract

- Start with `python -m sentinel_pilot --host 127.0.0.1 --port <port>` during development.
- The Tauri main process supplies a free random port when launching the compiled sidecar.
- SQLite and service logs are written under the OS user data directory.
- CORS allows local development origins plus Tauri WebView origins such as `https://tauri.localhost` and `tauri://localhost`.
- Packaged resources are resolved through the PyInstaller extraction directory when frozen.

## Frontend Desktop Contract

- `next.config.ts` uses `output: "export"`.
- The API client uses `NEXT_PUBLIC_API_BASE_URL` in local development.
- In Tauri, the API client invokes `backend_base_url` and calls the sidecar over local HTTP.
- Dynamic detail pages use query-string routes such as `/alerts/detail?id=...` so static export remains valid.

## Verification Checklist

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check .

cd ..\frontend
npm run lint
npm run build
npm run tauri:build
```

After building, run the desktop executable and verify:

- The main window opens without a console window.
- `/health` is reachable through the dynamically assigned backend port.
- Closing the main window removes the backend sidecar process tree.
- The dark-mode dashboard, integrations, settings, and eval pages do not show bright legacy dividers or badge backgrounds.
