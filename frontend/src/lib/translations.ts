// Central translation dictionary for SentinelPilot (Simplified Chinese & English)

export type TranslationLanguage = 'zh' | 'en';
export type TranslationEntry = Partial<Record<TranslationLanguage, string>>;
type TranslationTree = TranslationEntry | { [key: string]: TranslationTree };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTranslationEntry(value: unknown): value is TranslationEntry {
  return isRecord(value) && (typeof value.zh === 'string' || typeof value.en === 'string');
}

export function getTranslationEntry(source: unknown, key: string): TranslationEntry | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return isTranslationEntry(value) ? value : undefined;
}

export function translateFrom(
  source: unknown,
  key: string,
  language: TranslationLanguage,
  fallback: string,
): string {
  const entry = getTranslationEntry(source, key);
  return entry?.[language] || entry?.en || fallback;
}

export const translations = {
  sidebar: {
    workspace: {
      zh: '导航',
      en: 'NAVIGATION'
    },
    alertInbox: {
      zh: '安全告警收件箱',
      en: 'Security Alerts'
    },
    evalDashboard: {
      zh: '研判效能与态势评估',
      en: 'Threat & Policy Analytics'
    },
    llmConfig: {
      zh: '大模型配置',
      en: 'LLM Configuration'
    },
    systemStatus: {
      zh: '系统状态栏',
      en: 'SYSTEM STATUS'
    },
    coprocessor: {
      zh: 'AI 研判大模型',
      en: 'AI Coprocessor'
    },
    coprocessorTip: {
      zh: '后台安全大模型研判引擎常驻运行中，负责安全日志特征分析与威胁推演。',
      en: 'Backend AI security model engine is continuously running, responsible for threat analysis and deduction.'
    },
    decider: {
      zh: '自动决策流',
      en: 'Auto Decider'
    },
    deciderTip: {
      zh: '自动化响应策略执行引擎已就绪，等待下发拦截动作或请求审批。',
      en: 'Automated response policy execution engine is ready, waiting to dispatch actions or request approval.'
    },
    backendStatus: {
      zh: '后端服务',
      en: 'Backend API'
    },
    backendStatusTip: {
      zh: '平台后端核心服务连接状态',
      en: 'Core backend service connection status'
    },
    imCollaboration: {
      zh: '即时通讯协同',
      en: 'IM Collaboration'
    },
    providers: {
      dingtalk: { zh: '钉钉', en: 'DingTalk' },
      feishu: { zh: '飞书', en: 'Feishu' },
      wecom: { zh: '企业微信', en: 'WeCom' },
      mock: { zh: 'Mock 模型', en: 'Mock Model' },
      openai_compatible: { zh: 'OpenAI 兼容', en: 'OpenAI Compatible' },
      unknown: { zh: '未知渠道', en: 'Unknown Channel' }
    },
    running: {
      zh: '运行中',
      en: 'Running'
    },
    ready: {
      zh: '已就绪',
      en: 'Ready'
    },
    serviceOnline: {
      zh: '已连接',
      en: 'Online'
    },
    serviceConnecting: {
      zh: '连接中...',
      en: 'Connecting...'
    },
    serviceOffline: {
      zh: '已断开',
      en: 'Offline'
    },
    dtFull: {
      zh: '全功能',
      en: 'Interactive'
    },
    dtFullTip: {
      zh: '即时通讯互动卡片审批已启用，可在对应软件内直接进行告警阻断审批。',
      en: 'Interactive card approval is enabled, allowing direct mitigation approvals in the configured IM app.'
    },
    dtNotify: {
      zh: '仅通知',
      en: 'Notify Only'
    },
    dtNotifyTip: {
      zh: '通知推送已启用，但不包含卡片审批回调。',
      en: 'Notifications enabled without interactive callback support.'
    },
    dtDisabled: {
      zh: '未启用',
      en: 'Disabled'
    },
    dtDisabledTip: {
      zh: '即时通讯协同未配置或未开启。',
      en: 'IM collaboration is not configured or disabled.'
    }
  },

  alerts: {
    breadcrumbHome: {
      zh: '运行总览',
      en: 'Dashboard'
    },
    breadcrumbList: {
      zh: '安全告警台账',
      en: 'Security Alerts Ledger'
    },
    title: {
      zh: '安全告警收件箱',
      en: 'Security Alerts Inbox'
    },
    subtitle: {
      zh: 'SentinelPilot 自动安全研判平台统一告警列表，对不同源设备进行归一化及优先排定。',
      en: 'Normalized incident ledger for unified security alerts and response prioritization.'
    },
    searchPlaceholder: {
      zh: '搜索告警ID、标题或资产分类...',
      en: 'Search by Alert ID, title, or category...'
    },
    allAlerts: {
      zh: '全部告警',
      en: 'All Alerts'
    },
    colId: {
      zh: '告警 ID',
      en: 'Alert ID'
    },
    colSource: {
      zh: '设备源',
      en: 'Source'
    },
    colDescription: {
      zh: '告警描述',
      en: 'Description'
    },
    colSeverity: {
      zh: '严重级别',
      en: 'Severity'
    },
    colCategory: {
      zh: '威胁类型',
      en: 'Threat Tactic'
    },
    colTime: {
      zh: '注入时间',
      en: 'Injected At'
    },
    colAction: {
      zh: '操作',
      en: 'Action'
    },
    btnInvestigate: {
      zh: '启动研判',
      en: 'Investigate'
    },
    btnViewTrace: {
      zh: '查看研判痕迹',
      en: 'View Trace'
    },
    noAlerts: {
      zh: '无对应严重级别的告警数据。',
      en: 'No alerts found for this severity level.'
    },
    totalCount: {
      zh: '共 {count} 条告警',
      en: 'Total {count} alerts'
    },
    severity: {
      critical: { zh: '紧急', en: 'Critical' },
      high: { zh: '高危', en: 'High' },
      medium: { zh: '中危', en: 'Medium' },
      low: { zh: '低危', en: 'Low' }
    },
    status: {
      new: { zh: '新入告警', en: 'New' },
      investigating: { zh: '研判中', en: 'Investigating' },
      closed: { zh: '已闭环归档', en: 'Closed' }
    }
  },

  alertDetail: {
    breadcrumbHome: {
      zh: '运行总览',
      en: 'Dashboard'
    },
    breadcrumbList: {
      zh: '安全告警台账',
      en: 'Security Alerts Ledger'
    },
    breadcrumbDetail: {
      zh: '告警详情',
      en: 'Alert Details'
    },
    title: {
      zh: '安全告警详情',
      en: 'Security Alert Details'
    },
    subtitle: {
      zh: '对当前源安全事件的归一化字段和原始 JSON 日志进行深度剖析。',
      en: 'Deep-dive analysis of normalized alert attributes and raw payload data.'
    },
    copilotTitle: {
      zh: 'AI 研判协同中心',
      en: 'AI Copilot Investigation Center'
    },
    copilotDesc: {
      zh: 'SentinelPilot AI 安全协处理器已准备就绪。点击下方按钮拉起确定性自动化分析工作流，调用日志取证、威胁情报和知识库策略进行全生命周期研判。',
      en: 'SentinelPilot AI Security Coprocessor is ready. Click below to launch a deterministic automated investigation flow, calling forensic logs, threat intelligence, and playbooks.'
    },
    btnLaunch: {
      zh: '拉起 AI 自动化研判工作流',
      en: 'Launch AI Automated Investigation'
    },
    btnLaunching: {
      zh: '正在拉起研判工作流...',
      en: 'Launching Investigation Workflow...'
    },
    normalizedFields: {
      zh: '统一归一化字段',
      en: 'Normalized Fields'
    },
    fieldIp: {
      zh: '源 IP 地址',
      en: 'Source IP (src_ip)'
    },
    fieldHost: {
      zh: '目标主机',
      en: 'Destination Host (dst_host)'
    },
    fieldUser: {
      zh: '登录账户',
      en: 'Logon Account (username)'
    },
    fieldTime: {
      zh: '时间区间',
      en: 'Incident Timeframe'
    },
    fieldStart: {
      zh: '起始时间',
      en: 'Start Time'
    },
    fieldEnd: {
      zh: '结束时间',
      en: 'End Time'
    },
    emptyEntities: {
      zh: '当前告警没有提取到特定实体属性。',
      en: 'No entities extracted for this alert.'
    },
    rawLog: {
      zh: '原始安全设备日志数据',
      en: 'Raw Security Alert Log Payload (JSON)'
    }
  },

  investigation: {
    breadcrumbHome: {
      zh: '运行总览',
      en: 'Dashboard'
    },
    breadcrumbList: {
      zh: '安全告警台账',
      en: 'Security Alerts Ledger'
    },
    breadcrumbTrace: {
      zh: 'AI 自动化研判时间线',
      en: 'AI Investigation Trace'
    },
    title: {
      zh: '自动化安全研判工作台',
      en: 'Automated Investigation Workspace'
    },
    subtitle: {
      zh: 'AI 协处理器正在对当前安全事件进行全生命周期溯源研判与策略响应。',
      en: 'AI Coprocessor is conducting full lifecycle threat hunting and automated policy response.'
    },
    severity: {
      zh: '严重级别',
      en: 'Severity'
    },
    category: {
      zh: '威胁分类',
      en: 'Tactic Category'
    },
    mitre: {
      zh: 'MITRE ATT&CK 战术',
      en: 'MITRE ATT&CK Tactics'
    },
    summary: {
      zh: '研判结论摘要',
      en: 'Investigation Executive Summary'
    },
    statusTitle: {
      zh: '工作流状态',
      en: 'Workflow Status'
    },
    pollingText: {
      zh: '研判工作流运行中 • 每2秒自动同步状态...',
      en: 'Investigation running • polling every 2s...'
    },
    approvalPanelTitle: {
      zh: '⚠️ 高危阻断处置决策审计',
      en: '⚠️ High-Risk Action Mitigation Audit (SOC Human Approval)'
    },
    approvalPanelDesc: {
      zh: '高风险缓解动作必须经过人工授权审计，防止安全策略意外阻断业务运行。',
      en: 'High-risk mitigation actions require manual authorization to prevent unexpected business impact.'
    },
    recommendedAction: {
      zh: 'AI 推荐响应动作',
      en: 'AI Recommended Action'
    },
    targetEntity: {
      zh: '关联动作目标',
      en: 'Target Entity'
    },
    riskLevel: {
      zh: '处置动作风险',
      en: 'Action Risk Level'
    },
    reasonText: {
      zh: 'AI 研判决策审计理由',
      en: 'Investigation Audit Rationale'
    },
    commentPlaceholder: {
      zh: '输入审批备注说明（可选）...',
      en: 'Enter audit comment (optional)...'
    },
    btnApprove: {
      zh: '确认授权执行',
      en: 'Approve Mitigation (APPROVE)'
    },
    btnReject: {
      zh: '驳回推荐决策',
      en: 'Reject Recommendation (REJECT)'
    },
    statusWaitingApproval: {
      zh: '等待人工审批授权...',
      en: 'Pending Manual Authorization...'
    },
    statusRunning: {
      zh: 'AI 研判溯源中...',
      en: 'AI Hunting in progress...'
    },
    statusCompleted: {
      zh: '研判完成，已生成报告',
      en: 'Investigation Completed. Report Ready.'
    },
    statusFailed: {
      zh: '研判异常中断',
      en: 'Investigation Failed'
    },
    statusCancelled: {
      zh: '研判任务已取消',
      en: 'Investigation Cancelled'
    },
    timelineTitle: {
      zh: '自动化取证与威胁溯源时间线',
      en: 'Automated Forensic & Threat Timeline (AUTOMATED TIMELINE)'
    },
    step: {
      zh: '步骤',
      en: 'STEP'
    },
    viewLogs: {
      zh: '查看诊断日志',
      en: 'View Diagnostics Log'
    },
    hideLogs: {
      zh: '收起诊断日志',
      en: 'Hide Diagnostics Log'
    },
    errorTitle: {
      zh: '研判失败错误摘要',
      en: 'Investigation Failure Exception Summary'
    },
    reportHeader: {
      zh: '学术级判定报告',
      en: 'Academic Incident Investigation Report'
    },
    copySuccess: {
      zh: '已复制报告 Markdown 格式到剪贴板！',
      en: 'Copied report Markdown to clipboard!'
    },
    copyBtn: {
      zh: '复制 Markdown 报告',
      en: 'Copy Markdown Report'
    },
    stepTypes: {
      agent_message: { zh: 'Agent 研判思考', en: 'AI Agent Rationale' },
      tool_call: { zh: '调用工具分析', en: 'Forensic Tool Call' },
      tool_result: { zh: '工具返回结果', en: 'Forensic Tool Result' },
      approval_created: { zh: '触发高危处置审批', en: 'Mitigation Action Created' },
      approval_decision: { zh: '决策审批结果', en: 'Mitigation Action Decided' },
      report_created: { zh: '生成判定报告', en: 'Incident Report Created' },
      error: { zh: '链路异常', en: 'Workflow Exception' }
    },
    actionTypes: {
      block_ip: { zh: '阻断源 IP 恶意入站', en: 'Block IP Address (block_ip)' },
      isolate_host: { zh: '终端安全强行隔离', en: 'Isolate Endpoint Host (isolate_host)' },
      disable_user: { zh: '禁用受损登录账户', en: 'Disable Account (disable_user)' },
      collect_artifact: { zh: '提取终端分析样本', en: 'Collect Forensic Artifact (collect_artifact)' },
      notify_owner: { zh: '向资产归属方预警', en: 'Notify System Owner (notify_owner)' }
    },
    riskLevels: {
      critical: { zh: '极高风险', en: 'Critical Risk' },
      high: { zh: '高风险', en: 'High Risk' },
      medium: { zh: '中等风险', en: 'Medium Risk' },
      low: { zh: '低风险', en: 'Low Risk' }
    },
    statusLabel: {
      created: { zh: '创建任务', en: 'Created' },
      running: { zh: '深度研判中', en: 'Hunting' },
      waiting_approval: { zh: '等待人工授权', en: 'Pending Approval' },
      completed: { zh: '研判圆满结束', en: 'Completed' },
      failed: { zh: '研判运行故障', en: 'Failed' },
      cancelled: { zh: '任务已取消', en: 'Cancelled' }
    }
  },

  report: {
    'Executive Summary': { zh: '1. 执行摘要', en: '1. Executive Summary' },
    'Alert Details': { zh: '2. 告警详细数据', en: '2. Alert Details' },
    'Investigation Steps': { zh: '3. 研判分析步骤', en: '3. Investigation Steps' },
    'Evidence Chain': { zh: '4. 取证证据链', en: '4. Evidence Chain' },
    'MITRE ATT&CK Mapping': { zh: '5. MITRE ATT&CK 映射', en: '5. MITRE ATT&CK Mapping' },
    'Impact Assessment': { zh: '6. 影响范围评估', en: '6. Impact Assessment' },
    'Response Recommendations': { zh: '7. 响应处置建议', en: '7. Response Recommendations' },
    'Approval History': { zh: '8. 决策审批记录', en: '8. Approval History' },
    'Hardening Recommendations': { zh: '9. 系统加固建议', en: '9. Hardening Recommendations' },
    'Full Report': { zh: '全景完整报告', en: 'Full Incident Report' }
  },

  evals: {
    title: {
      zh: '安全研判效能与态势评估中心',
      en: 'Security Investigation & Threat Analytics Console'
    },
    subtitle: {
      zh: '大模型安全研判引擎的效能评估与威胁态势分析大屏，展示系统告警重要性分布、AI 协处理器时效统计以及研判判定分析结果的多维要素校验。',
      en: 'AI security investigation engine efficiency and threat intelligence visual dashboard, showing alert severity distribution, AI coprocessor response metrics, and multi-dimensional analysis elements verification.'
    },
    btnTrigger: {
      zh: '评估大模型研判效能',
      en: 'Run Investigation Performance Evaluation'
    },
    btnRunning: {
      zh: '正在执行研判效能校验中...',
      en: 'Evaluating AI Investigation Performance...'
    },
    errorTitle: {
      zh: '研判效能评估异常',
      en: 'Investigation Performance Evaluation Failure'
    },

    // HUD Cards
    cardSeverityTitle: {
      zh: '告警威胁评级',
      en: 'Alert Threat Urgency Distribution'
    },
    cardSeveritySubtitle: {
      zh: '当前系统内的告警严重级别占比，反映网络威胁紧急程度。',
      en: 'Active alert severity levels reflecting real-time organizational threat urgency.'
    },
    cardSeverityTotal: {
      zh: '系统告警总数',
      en: 'Total Active Alerts'
    },

    cardEfficiencyTitle: {
      zh: 'AI 研判时效与自主闭环',
      en: 'AI Investigation Velocity & Autonomy'
    },
    cardEfficiencySubtitle: {
      zh: 'AI 协处理器的研判分析响应时效及威胁判定结论的完整度校验。',
      en: 'Forensic velocity and validation rate of automated security playbooks.'
    },
    cardEfficiencyAvg: {
      zh: '平均研判时间',
      en: 'Avg Response Time'
    },
    cardEfficiencyVal: {
      zh: '约 0.85s',
      en: '~0.85s'
    },
    cardEfficiencyClose: {
      zh: '模型自主闭环',
      en: 'Autonomous Closing'
    },
    cardEfficiencyCloseVal: {
      zh: '6 大研判场景',
      en: '6 Key Scenarios'
    },

    cardMitigationTitle: {
      zh: '威胁研判精准度评估',
      en: 'Threat Investigation & Verdict Accuracy'
    },
    cardMitigationSubtitle: {
      zh: '评估 AI 协处理器在识别真实安全威胁与固化完整取证链条上的判定成效。',
      en: 'Evaluating AI coprocessor precision in identifying threats and securing complete forensic evidence.'
    },
    cardMitigationBlocked: {
      zh: '确证威胁与深度取证结论',
      en: 'Confirmed Threats Fully Analyzed'
    },
    cardMitigationBlockedVal: {
      zh: '3 次高维深度分析',
      en: '3 Deep Investigative Scenarios'
    },

    // Breakdown Table / Cards
    sectionCasesTitle: {
      zh: '典型威胁研判与分析结果明细',
      en: 'Threat Investigation & Performance Detail'
    },
    caseLabel: {
      zh: '研判案例场景',
      en: 'INVESTIGATION SCENARIO'
    },
    policyActive: {
      zh: '研判结论可靠',
      en: 'Investigation Verdict Reliable'
    },
    policyFailed: {
      zh: '研判结论存疑',
      en: 'Investigation Verdict Suspicious'
    },
    viewAuditLogs: {
      zh: '查看评估详情',
      en: 'View Evaluation Details'
    },
    graderLogsTitle: {
      zh: 'Grader 威胁研判质量评估报告',
      en: 'Grader Threat Analysis Quality Evaluation'
    },

    // Empty State
    suiteReadyTitle: {
      zh: '安全事件研判评估套件就绪',
      en: 'Evaluation Console Ready'
    },
    suiteReadyDesc: {
      zh: '尚未加载大模型安全研判评估报告。点击右上角“评估大模型研判效能”启动对 6 大核心网络威胁场景研判结论的效能评估。',
      en: 'AI threat investigation performance reports not loaded. Click the button in the top right to launch performance evaluation.'
    },

    // Grader Metrics
    metrics: {
      severity: { zh: '威胁级别判定结论', en: 'Threat Severity Verdict' },
      category: { zh: '威胁类型研判结果', en: 'Threat Type Classification' },
      mitre: { zh: '攻击战术映射结果', en: 'MITRE Tactics Mapping' },
      tools: { zh: '取证分析深度结论', en: 'Deep Forensic Verdicts' },
      approval: { zh: '安全响应处置结果', en: 'Mitigation Action Outcomes' },
      evidence: { zh: '研判报告证据固化', en: 'Locked Evidence Chain' }
    }
  },
  mockAlerts: {
    'SSH brute force against admin': {
      zh: 'SSH 登录暴力破解攻击',
      en: 'SSH brute force against admin'
    },
    'Multiple failed SSH logins followed by one successful login.': {
      zh: '多方源高频尝试密码猜测且连续失败，随后伴随一次成功的凭据登录行为。',
      en: 'Multiple failed SSH logins followed by one successful login.'
    },
    'Suspicious PowerShell encoded command': {
      zh: '混淆 PowerShell 恶意命令执行',
      en: 'Suspicious PowerShell encoded command'
    },
    'Endpoint telemetry detected encoded PowerShell with network download behavior.': {
      zh: '终端检测到包含 Base64 编码混淆的 PowerShell 命令，并伴随网络拉取载荷行为。',
      en: 'Endpoint telemetry detected encoded PowerShell with network download behavior.'
    },
    'Possible webshell upload': {
      zh: 'Webshell 网页后门脚本上载',
      en: 'Possible webshell upload'
    },
    'Web upload request stored a suspicious script in a public directory.': {
      zh: 'Web 异常上传行为请求向公共可执行目录写入了可疑的网页木马脚本。',
      en: 'Web upload request stored a suspicious script in a public directory.'
    },
    'Malicious domain access': {
      zh: 'DGA 动态域名通信（暗网中继）',
      en: 'Malicious domain access'
    },
    'Host resolved and connected to a domain listed in local threat intelligence.': {
      zh: '内网主机尝试发起网络连接至本地已知威胁情报黑名单所列的可疑外部域名。',
      en: 'Host resolved and connected to a domain listed in local threat intelligence.'
    },
    'Possible lateral movement across servers': {
      zh: '内网主机纵向/横向渗透行为',
      en: 'Possible lateral movement across servers'
    },
    'The same account authenticated to several servers in a short time window.': {
      zh: '检测到相同特权账号在极短的时间周期内横向对多台敏感数据库及相邻服务器发起高频连接。',
      en: 'The same account authenticated to several servers in a short time window.'
    },
    'Known scanner false positive': {
      zh: '研发测试场景良性业务误报',
      en: 'Known scanner false positive'
    },
    'A scheduled vulnerability scanner triggered a low-risk detection.': {
      zh: '研发测试部门的定期安全漏洞扫描探测，触发了低风险事件级别良性误报。',
      en: 'A scheduled vulnerability scanner triggered a low-risk detection.'
    },
    'SSH brute force source has suspicious threat intelligence and a successful login was observed after repeated failed attempts.': {
      zh: 'SSH 暴力破解源具有可疑的威胁情报特征，且在连续高频尝试密码猜测失败后观察到一次成功的凭据登录行为。',
      en: 'SSH brute force source has suspicious threat intelligence and a successful login was observed after repeated failed attempts.'
    },
    'Suspicious PowerShell execution was confirmed with local process evidence.': {
      zh: '终端进程审计日志及命令特征确证了存在高风险的混淆 PowerShell 异常命令执行行为。',
      en: 'Suspicious PowerShell execution was confirmed with local process evidence.'
    },
    'Domain and network evidence indicate command and control behavior.': {
      zh: '出站 DNS 解析与高频微小包信标特征确证受控终端正与外部 C2 服务器进行恶意信道通信。',
      en: 'Domain and network evidence indicate command and control behavior.'
    },
    'Web intrusion evidence indicates a likely webshell upload or execution path.': {
      zh: 'Web 访问与上传日志分析证实存在可疑的网页后门脚本（Webshell）上载并尝试获取网页服务器控制权。',
      en: 'Web intrusion evidence indicates a likely webshell upload or execution path.'
    },
    'Lateral movement evidence shows remote access patterns across hosts.': {
      zh: '安全审计日志证实存在特权凭据在短周期内向内网多台相邻网段服务器发起高频异常连接的横向渗透与传播特征。',
      en: 'Lateral movement evidence shows remote access patterns across hosts.'
    },
    'Known scanner activity indicates a low-risk false positive.': {
      zh: '已知漏洞扫描器活动，确证该事件为低风险研发测试场景良性业务误报。',
      en: 'Known scanner activity indicates a low-risk false positive.'
    },
    'Investigation completed using local evidence without severity promotion.': {
      zh: '基于本地取证分析证据已完成研判分析工作流，本场景未触发威胁严重级提升。',
      en: 'Investigation completed using local evidence without severity promotion.'
    }
  }
} as const satisfies Record<string, TranslationTree>;
