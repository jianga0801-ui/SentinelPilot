#!/usr/bin/env bash
set -euo pipefail

TARGET_TRIPLE="${1:-x86_64-unknown-linux-gnu}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/scripts/build-backend-sidecar.sh" "${TARGET_TRIPLE}"

cd "${ROOT_DIR}/frontend"
npm run tauri:build
