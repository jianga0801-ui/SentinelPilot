# SentinelPilot Frontend

Next.js frontend for the local SentinelPilot operations console and Tauri desktop shell.

The app is compatible with static export. Runtime business data always comes from the FastAPI backend; there are no frontend API routes.

## Run Locally

```powershell
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Open `http://localhost:3000`.

Start the backend on `http://127.0.0.1:8000` before using live data. In Tauri desktop mode the frontend receives the backend URL by invoking the `backend_base_url` command from the Rust main process.

## Static Export

```powershell
npm run build
```

`next.config.ts` uses `output: "export"` and unoptimized images so the UI can be embedded from `frontend/out`.

## Desktop Shell

```powershell
npm run tauri:build
```

Run `..\scripts\build-desktop.ps1` from the repository root when the backend sidecar binary also needs to be rebuilt.

## Quality Checks

```powershell
npm run lint
npm run build
```

## UI Notes

- The sidebar can collapse and can be resized by dragging its right edge.
- Theme state is local to the browser and supports light/dark mode plus multiple accent palettes.
- Chinese and English UI branches should keep the same structure, component sizes, and state colors.
