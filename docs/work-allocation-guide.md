# SentinelPilot 任务分配参考

版本：0.2
日期：2026-05-22
用途：辅助项目负责人拆分开发任务，不作为技术需求的唯一依据

主开发文档以 `docs/SentinelPilot-development-guide.md` 为准。

---

## 1. 分配原则

- 主开发文档是技术需求和接口契约的唯一依据。
- 所有任务必须遵守主开发文档中的 API 契约、数据模型、开发规范和质量检查清单。
- 按接口边界拆分任务，避免多人同时改同一批文件。
- 后端 API 未完成前，前端可以使用 mock 数据，但字段必须与主开发文档的 API Contract 一致。
- 涉及真实密钥、Webhook、客户数据、设备数据的任务必须单独做安全检查。
- 本文档中的 `2.x` 编号表示工作包编号，不表示执行顺序。执行顺序以“推荐执行顺序”为准。

版本号含义：

- 主版本：分配方法或工作包边界发生重大调整。
- 次版本：新增、删除或重排工作包。
- 修订版本：修正文案、交付说明或引用。

---

## 2. 可分配环节

### 2.1 后端基础工程

范围：

- FastAPI 项目骨架
- 配置管理
- 健康检查接口
- 测试框架
- Ruff 配置
- `.env.example`

输入：

- 主开发文档：Confirmed Decisions、Repository Layout、Development Standards、Build the Initial Version

输出：

- 可启动的后端服务
- `GET /health`
- 可运行的测试命令

适合分配给：

- 熟悉 Python、FastAPI、pytest 的开发者

### 2.2 安全告警样例数据

范围：

- 样例告警 JSON
- 样例日志 JSONL
- 模拟威胁情报数据
- 知识库 Markdown
- Eval 数据集

输入：

- 主开发文档：Normalized Data Model、Example Scenarios、Build the Initial Version

输出：

- `examples/alerts/`
- `examples/logs/`
- `examples/threat_intel/`
- `knowledge_base/`
- `evals/datasets/`

适合分配给：

- 熟悉安全运维、告警研判、日志字段的开发者

### 2.3 安全设备 Adapter

范围：

- `MockAlertSource`
- 通用 `SecurityDeviceAdapter` 接口
- WAF、IPS、Antivirus、EDR、NDR、SIEM adapter 骨架
- 告警归一化逻辑

输入：

- 主开发文档：Security Device Adapter Model、Repository Layout、Normalized Data Model、Enterprise Rollout

输出：

- `backend/sentinel_pilot/adapters/`
- Adapter 单元测试

适合分配给：

- 熟悉安全设备告警格式、日志归一化、接口抽象的开发者

### 2.4 Investigation 和 Timeline

范围：

- Investigation 生命周期
- Timeline 事件记录
- SQLite repository
- Investigation API

输入：

- 主开发文档：Investigation State Model、API Contract、Normalized Data Model、Build the Initial Version

输出：

- `POST /api/investigations`
- `GET /api/investigations/{id}`
- `GET /api/investigations/{id}/timeline`
- 持久化测试

适合分配给：

- 熟悉后端业务建模、状态机、数据库访问的开发者

### 2.5 Agent 工具系统

范围：

- `get_alert`
- `search_logs`
- `lookup_threat_intel`
- `search_knowledge_base`
- `map_mitre_attack`
- `write_report`
- 工具注册表

输入：

- 主开发文档：Agent Workflow、Tools、Example Scenarios、Development Standards、Build the Initial Version

输出：

- `backend/sentinel_pilot/agent/tools.py`
- `backend/sentinel_pilot/agent/tool_registry.py`
- 工具单元测试

适合分配给：

- 熟悉 Python、确定性函数、测试驱动开发的开发者

### 2.6 Agent Orchestrator

范围：

- 固定调查流程
- 状态推进
- 工具调用记录
- 结构化输出
- mock model 支持

输入：

- 主开发文档：Investigation State Model、Agent Workflow、API Contract、Build the Initial Version

输出：

- `POST /api/investigations/{id}/run`
- 完整调查流程测试

适合分配给：

- 熟悉 Agent 工作流、状态机、结构化输出的开发者

### 2.7 审批系统

范围：

- Approval 数据模型
- 审批列表 API
- 审批决策 API
- 审批状态写入 timeline

输入：

- 主开发文档：Investigation State Model、API Contract、Normalized Data Model、Development Standards、Build the Initial Version

输出：

- `GET /api/investigations/{id}/approvals`
- `POST /api/approvals/{id}/decision`
- 审批测试

适合分配给：

- 熟悉业务流程、幂等控制、状态变更、审计记录的开发者

### 2.8 报告生成

范围：

- Markdown 报告模板
- 证据链引用
- MITRE ATT&CK 映射展示
- 审批记录展示

输入：

- 主开发文档：Agent Workflow、API Contract、Example Scenarios、Build the Initial Version

输出：

- `GET /api/investigations/{id}/report`
- 报告生成测试

适合分配给：

- 熟悉安全事件报告、Markdown 生成、模板渲染的开发者

### 2.9 Eval Runner

范围：

- Eval case 格式
- Grader
- 批量运行命令
- Eval summary

输入：

- 主开发文档：Build the Initial Version、Enterprise Rollout、Operational Requirements

输出：

- `python -m sentinel_pilot.evals.runner`
- Eval JSON 输出
- Eval 测试

适合分配给：

- 熟悉测试设计、评估指标、数据校验的开发者

### 2.10 前端工作台

范围：

- 告警列表
- 告警详情
- 调查工作台
- 时间线
- 审批面板
- 报告预览
- Eval 页面
- IM 状态展示

输入：

- 主开发文档：API Contract、Frontend Responsibilities、Build the Initial Version

输出：

- `frontend/`
- 可访问的 Web UI
- 与后端 API 联调通过

适合分配给：

- 熟悉 Next.js、TypeScript、Tailwind CSS、数据可视化的开发者

### 2.11 钉钉互动卡片与通知

范围：

- 钉钉互动卡片配置
- Webhook 兜底配置
- 卡片回调签名校验
- 测试通知 API
- 审批提醒
- 审批按钮回调
- 调查完成摘要

输入：

- 主开发文档：API Contract、Build the Initial Version、Enterprise Rollout

输出：

- `backend/sentinel_pilot/integrations/im/dingtalk.py`
- `GET /api/integrations/im/status`
- `POST /api/integrations/im/test`
- `POST /api/integrations/im/dingtalk/card-callback`
- IM 通知测试

适合分配给：

- 熟悉 HTTP 回调、安全签名、第三方 IM 集成的开发者

### 2.12 Docker 和发布文档

范围：

- Dockerfile
- `docker-compose.yml`
- README
- 架构文档
- API 文档
- Eval 报告文档
- 发布前安全检查

输入：

- 主开发文档：Build the Initial Version、Quality Checklist、References

输出：

- 一键启动
- 完整 README
- 发布检查通过

适合分配给：

- 熟悉工程交付、Docker、技术文档整理的开发者

---

## 3. 推荐执行顺序

### 第一批：基础能力

```text
1. 后端基础工程
2. 安全告警样例数据
3. 安全设备 Adapter
4. Investigation 和 Timeline
```

### 第二批：核心闭环

```text
5. Agent 工具系统
6. Agent Orchestrator
7. 审批系统
8. 报告生成
```

### 第三批：产品质量

```text
9. Eval Runner
10. 前端工作台
11. Docker 和发布文档
```

### 第四批：增强项

```text
12. 钉钉互动卡片与通知（对应工作包 2.11）
```

---

## 4. 并行建议

可以并行：

- 后端基础工程 与 安全告警样例数据
- 前端工作台 与 后端 API 实现，但前端 mock 字段必须与 API Contract 一致
- Eval Runner 与 Agent 工具系统，但需要先固定 eval case 格式
- Docker 配置 与 后端功能开发，但需要启动命令相对稳定

不建议并行：

- API 契约频繁变化时投入大量前端细节开发
- Investigation 状态机未稳定前开发复杂审批 UI
- Adapter 接口未稳定前实现多个厂商适配
- 报告结构未稳定前做报告导出或打印优化

---

## 5. 交付验收方式

每个环节交付时必须提供：

- 改动文件列表
- 启动或测试命令
- 测试通过结果
- 已知未完成事项
- 是否影响 API 契约
- 是否新增配置项
- 是否涉及密钥、Webhook 或外部服务

如果变更影响 API 契约，必须同步更新：

- `docs/SentinelPilot-development-guide.md` 中的 API Contract
- 后端 API 测试
- 前端 API 类型定义
