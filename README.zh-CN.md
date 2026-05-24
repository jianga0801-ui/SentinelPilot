[English](./README.md) | [简体中文](./README.zh-CN.md)

# SentinelPilot

SentinelPilot 是一个纯本地部署的安全告警研判工作台。它负责归一化安全告警、编排确定性研判流程、记录证据与审批、生成 Markdown 事件报告，并提供面向 SOC 场景的运行总览、日志探索和设置中心。

## 项目截图

![运行总览截图](./docs/assets/screenshot-dashboard.png)
![通知集成截图](./docs/assets/screenshot-integrations.png)
![日志探索截图](./docs/assets/screenshot-logs.png)
![系统设置截图](./docs/assets/screenshot-settings.png)
![评估中心截图](./docs/assets/screenshot-evals.png)
![审批流程截图](./docs/assets/screenshot-approval.png)

## 当前能力

- **运行总览**：可收起、可拖拽调宽侧栏，多主题色深浅模式，健康状态卡片、核心指标、高危队列和最近研判时间线。
- **丰富告警数据**：6 条手工基线告警，加 240 条确定性扩展样例，让列表和看板更接近真实项目观感。
- **自动化研判**：日志检索、威胁情报、MITRE ATT&CK 映射、知识库检索、审批创建和报告生成。
- **人工审批**：高风险动作只创建审批或模拟执行记录，不执行真实阻断、隔离、禁用账号或安全策略变更。
- **系统设置中心**：配置写入本地数据库，密钥类字段只显示是否已配置，不回显明文。
- **通知机器人**：支持钉钉、飞书、企业微信机器人配置；钉钉额外支持交互式审批卡片回调。
- **日志中心**：支持本地原始安全日志检索和服务运行日志查看。
- **评测引擎**：内置 baseline case，用于验证研判严重性、分类和 MITRE 映射质量。

## 技术栈

- **后端**：Python 3.11+、FastAPI、Pydantic v2、SQLite
- **前端**：Next.js 16、TypeScript、Tailwind CSS
- **桌面运行时**：Tauri 2 桌面壳、Next.js 静态导出、Python FastAPI sidecar
- **数据来源**：本地样例告警、本地 JSONL 安全日志、本地 SQLite

## 快速开始

### 本地开发后端

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
python -m sentinel_pilot --host 127.0.0.1 --port 8000
```

### 本地开发前端

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

浏览器访问：

- 前端工作台：`http://localhost:3000`
- 后端接口文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`

## 桌面应用构建

Windows：

```powershell
.\scripts\build-desktop.ps1
```

Linux：

```bash
bash scripts/build-desktop.sh
```

脚本会先把 FastAPI 后端打包成 Tauri sidecar 二进制文件，再把 Next.js 导出到 `frontend/out`，最后生成原生桌面安装包。Windows 产物位于 `frontend/src-tauri/target/release/bundle/`。

## 验证命令

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check .
```

```powershell
cd frontend
npm run lint
npm run build
npm run tauri:build
```

## 配置说明

需要本地覆盖配置时，将 `.env.example` 复制为 `.env`。真实 API Key、机器人 Webhook 和签名密钥只能放在本地 `.env`。可以从前端修改的运行态配置会写入本地 `system_config` 表，并通过 `/api/settings` 脱敏返回。

桌面模式下，SQLite 数据库和服务日志写入操作系统用户数据目录，不写入安装目录。Windows 下路径为 `%APPDATA%\SentinelPilot`。

## 文档参考

- [架构指南](docs/architecture.md)
- [API 契约](docs/api-contract.md)
- [桌面打包说明](docs/desktop-packaging.md)
- [评测报告与测试](docs/eval-report.md)
- [IM 集成](docs/im-integration.md)
- [开发进度计划](docs/development-progress-plan.zh-CN.md)
