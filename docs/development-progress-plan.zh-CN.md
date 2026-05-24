# SentinelPilot 开发进度记录

更新时间：2026-05-25

## 当前阶段

M14 桌面化打包与暗色视觉修复已完成 Windows 本机验证；Linux 构建脚本已补齐并通过 Bash 语法检查，实际 Linux 安装包需要在 Linux 构建机执行。

## 当前实现状态

| 模块 | 状态 | 说明 |
|---|---|---|
| 告警归一化 | 已完成 | 6 条手工基线告警，加 240 条确定性扩展样例。 |
| 研判工作流 | 已完成 | 确定性工具、时间线、审批、报告、可选 LLM 均保持本地可运行。 |
| 人工审批 | 已完成 | 高风险动作只创建审批或模拟记录，不执行真实处置。 |
| 通知集成 | 已完成 | 支持钉钉、飞书、企业微信机器人配置；钉钉支持交互式审批卡片回调。 |
| 设置中心 | 已完成 | 配置写入 `system_config`，敏感字段只显示是否已配置。 |
| 日志中心 | 已完成 | 原始安全日志检索和服务运行日志查看已接入前端。 |
| 运行总览 | 已完成 | 健康状态、核心指标、高危队列和最近研判时间线已整合。 |
| 主题与侧栏 | 已完成 | 侧栏可收起、可拖拽调宽；支持深浅模式和多主题色。 |
| Next.js 静态导出 | 已完成 | `output: "export"`，动态详情页改为 query 路由，构建产物输出到 `frontend/out`。 |
| FastAPI 桌面 sidecar | 已完成 | 支持 `--host` / `--port` 动态启动，数据库和服务日志写入用户数据目录。 |
| Tauri 桌面容器 | 已完成 | Tauri 启动随机端口 sidecar，WebView 读取动态后端地址，关闭主窗口清理 sidecar 进程树。 |
| Windows 安装包 | 已完成 | 已生成 `.msi` 和 NSIS `.exe` 安装包。 |
| Linux 打包脚本 | 已完成脚本 | 已提供 `scripts/build-desktop.sh`，当前 Windows 环境未生成 Linux 实机安装包。 |
| 文档与截图 | 已完成 | README、主开发文档、架构文档、桌面打包文档、前端 README、进度文档和深色截图已同步。 |

## 本次完成

- 修复深色模式下 `divide-y` 第一项分隔线仍使用浅色的问题，覆盖运行总览、通知集成、系统设置、日志/表格类页面。
- 降低评估中心高危、中危、低危、良性业务误报等标签在深色模式下的背景和边框亮度。
- 将 Next.js 改为静态导出模式，并移除依赖 SSR 跳转的首页逻辑。
- 将告警详情和研判详情改为静态导出兼容的 query 路由。
- 前端 API 客户端支持本地开发 `NEXT_PUBLIC_API_BASE_URL` 和 Tauri `backend_base_url` 动态地址。
- 新增 FastAPI 桌面入口 `python -m sentinel_pilot --host 127.0.0.1 --port <port>`。
- 后端运行时路径改为用户数据目录，Windows 默认 `%APPDATA%\SentinelPilot`。
- 增加 PyInstaller 资源解析，打包后可读取样例、知识库和 eval 数据。
- 扩展 CORS，允许本地开发来源和 Tauri WebView 来源。
- 集成 Tauri 2，配置窗口、图标、sidecar、权限和安装包目标。
- Tauri 主进程自动分配空闲端口、启动 Python sidecar、向前端暴露后端地址，并在关闭窗口时清理进程树。
- 新增 Windows 和 Linux 构建脚本。
- 更新深色模式截图：运行总览、通知集成、系统设置、评估中心和良性误报场景。

## 本次主要修改文件

- `README.md`
- `README.zh-CN.md`
- `docs/SentinelPilot-development-guide.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/desktop-packaging.md`
- `docs/work-allocation-guide.md`
- `docs/assets/screenshot-dashboard.png`
- `docs/assets/screenshot-integrations.png`
- `docs/assets/screenshot-settings.png`
- `docs/assets/screenshot-evals.png`
- `docs/assets/screenshot-evals-detail.png`
- `docs/assets/screenshot-evals-benign.png`
- `frontend/README.md`
- `frontend/next.config.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/eslint.config.mjs`
- `frontend/src/lib/api.ts`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/alerts/[id]/page.tsx`
- `frontend/src/app/alerts/detail/AlertDetailClient.tsx`
- `frontend/src/app/alerts/detail/page.tsx`
- `frontend/src/app/investigations/[id]/page.tsx`
- `frontend/src/app/investigations/detail/InvestigationDetailClient.tsx`
- `frontend/src/app/investigations/detail/ReportPreview.tsx`
- `frontend/src/app/investigations/detail/page.tsx`
- `frontend/src-tauri/`
- `backend/pyproject.toml`
- `backend/sentinel_pilot/__main__.py`
- `backend/sentinel_pilot/desktop_runtime.py`
- `backend/sentinel_pilot/runtime_resources.py`
- `backend/sentinel_pilot/config.py`
- `backend/sentinel_pilot/main.py`
- `backend/sentinel_pilot/adapters/base.py`
- `backend/sentinel_pilot/adapters/mock_source.py`
- `backend/sentinel_pilot/agent/tools.py`
- `backend/sentinel_pilot/evals/runner.py`
- `backend/sentinel_pilot/services/log_service.py`
- `backend/tests/test_desktop_runtime.py`
- `scripts/build-backend-sidecar.ps1`
- `scripts/build-backend-sidecar.sh`
- `scripts/build-desktop.ps1`
- `scripts/build-desktop.sh`

## 已运行验证

第一轮：

- `cd backend; .\.venv\Scripts\python.exe -m pytest -q` -> 88 passed
- `cd backend; .\.venv\Scripts\ruff.exe check .` -> All checks passed
- `cd frontend; npm run lint` -> 通过
- `cd frontend; npm run build` -> Next.js 静态导出成功，18/18 页面生成
- `.\scripts\build-backend-sidecar.ps1 -TargetTriple x86_64-pc-windows-msvc` -> PyInstaller sidecar 构建成功
- `cd frontend; npm run tauri:build` -> Windows `.msi` 和 NSIS `.exe` 构建成功
- 桌面程序生命周期验证 -> 动态端口 `58113`，`/health` 返回 200，关闭窗口后 sidecar 进程数为 0
- 浏览器深色模式验证 -> `/dashboard`、`/integrations`、`/settings`、`/evals` 均加载成功，console error/warn 为 0
- 评估中心标签验证 -> 高危、中危、低危、良性业务误报标签深色背景为低透明度，边框使用暗色变量

第二轮：

- `cd backend; .\.venv\Scripts\python.exe -m pytest -q` -> 88 passed
- `cd backend; .\.venv\Scripts\ruff.exe check .` -> All checks passed
- `cd frontend; npm run lint` -> 通过
- `cd frontend; npm run build` -> Next.js 静态导出成功，18/18 页面生成
- `C:\Program Files\Git\bin\bash.exe -n scripts/build-backend-sidecar.sh` -> 语法检查通过
- `C:\Program Files\Git\bin\bash.exe -n scripts/build-desktop.sh` -> 语法检查通过
- `.\scripts\build-desktop.ps1 -TargetTriple x86_64-pc-windows-msvc` -> sidecar + Tauri Windows 安装包完整构建成功
- 桌面程序生命周期复核 -> 动态端口 `62011`，`/health` 返回 200，关闭窗口后 sidecar 进程数为 0
- `git diff --check` -> 通过；仅有 Windows 行尾提示
- 明文敏感配置扫描 -> 未发现真实密钥；仅命中 `card_callback_secret` 变量赋值

## 当前产物

- Windows 桌面可执行文件：`frontend/src-tauri/target/release/sentinel-pilot-desktop.exe`
- Windows MSI 安装包：`frontend/src-tauri/target/release/bundle/msi/SentinelPilot_0.1.0_x64_en-US.msi`
- Windows NSIS 安装包：`frontend/src-tauri/target/release/bundle/nsis/SentinelPilot_0.1.0_x64-setup.exe`

## 当前阻碍

无 Windows 侧阻碍。Linux 实机安装包未在当前 Windows 环境生成，需要在 Linux 构建环境执行 `bash scripts/build-desktop.sh`。

## 下一步

- 在 Linux 构建机执行 `bash scripts/build-desktop.sh`，生成 `.deb` 和 `.AppImage` 并做同样的 sidecar 生命周期验证。
- 如需发布仓库版本，先复查当前工作树中已有的历史改动和已删除容器文件，再决定提交边界。

## 需要用户确认

无。当前版本仍坚持本地样例数据、安全模拟动作、密钥不回显和桌面用户数据目录持久化原则。
