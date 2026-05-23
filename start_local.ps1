$backendArgs = "-m uvicorn sentinel_pilot.main:app --port 8000 --reload"
Start-Process -FilePath ".\.venv\Scripts\python.exe" -ArgumentList $backendArgs -WorkingDirectory ".\backend" -WindowStyle Normal

Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory ".\frontend" -WindowStyle Normal

Write-Host "已在独立窗口中分别启动后端 (8000端口) 和前端 (3000端口)。"
Write-Host "前端访问地址: http://localhost:3000"
