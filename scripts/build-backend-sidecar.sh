#!/usr/bin/env bash
set -euo pipefail

TARGET_TRIPLE="${1:-x86_64-unknown-linux-gnu}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${ROOT_DIR}/backend/.venv/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Backend virtualenv not found at ${PYTHON_BIN}" >&2
  exit 1
fi

"${PYTHON_BIN}" -m pip show pyinstaller >/dev/null 2>&1 || "${PYTHON_BIN}" -m pip install "pyinstaller>=6.16.0"

mkdir -p "${ROOT_DIR}/frontend/src-tauri/binaries" "${ROOT_DIR}/scratch/pyinstaller"

"${PYTHON_BIN}" -m PyInstaller \
  --clean \
  --onefile \
  --name "sentinel-pilot-backend-${TARGET_TRIPLE}" \
  --distpath "${ROOT_DIR}/frontend/src-tauri/binaries" \
  --workpath "${ROOT_DIR}/scratch/pyinstaller" \
  --specpath "${ROOT_DIR}/scratch/pyinstaller" \
  --hidden-import sentinel_pilot.main \
  --add-data "${ROOT_DIR}/examples:examples" \
  --add-data "${ROOT_DIR}/knowledge_base:knowledge_base" \
  --add-data "${ROOT_DIR}/evals:evals" \
  "${ROOT_DIR}/backend/sentinel_pilot/desktop_runtime.py"
