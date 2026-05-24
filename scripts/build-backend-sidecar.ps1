param(
  [string]$TargetTriple = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
$Entry = Join-Path $RepoRoot "backend\sentinel_pilot\__main__.py"
$DistDir = Join-Path $RepoRoot "frontend\src-tauri\binaries"
$WorkDir = Join-Path $RepoRoot "scratch\pyinstaller"
$Name = "sentinel-pilot-backend-$TargetTriple"
$ExamplesDir = Join-Path $RepoRoot "examples"
$KnowledgeBaseDir = Join-Path $RepoRoot "knowledge_base"
$EvalsDir = Join-Path $RepoRoot "evals"

New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

Push-Location (Join-Path $RepoRoot "backend")
try {
  & $Python -m PyInstaller `
    --noconfirm `
    --onefile `
    --noconsole `
    --name $Name `
    --distpath $DistDir `
    --workpath $WorkDir `
    --specpath $WorkDir `
    --hidden-import sentinel_pilot.main `
    --add-data "$ExamplesDir;examples" `
    --add-data "$KnowledgeBaseDir;knowledge_base" `
    --add-data "$EvalsDir;evals" `
    $Entry
} finally {
  Pop-Location
}
