param(
  [string]$TargetTriple = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

& (Join-Path $PSScriptRoot "build-backend-sidecar.ps1") -TargetTriple $TargetTriple

Push-Location (Join-Path $RepoRoot "frontend")
try {
  npm run tauri:build
} finally {
  Pop-Location
}
