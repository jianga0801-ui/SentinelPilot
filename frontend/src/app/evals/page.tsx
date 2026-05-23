'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Workflow,
  Play,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { api, EvalRunSummary, AlertListItem } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const caseNames: Record<string, { zh: string; en: string }> = {
  eval_bruteforce_001: { zh: 'SSH 登录暴力破解攻击', en: 'SSH Logon Brute Force Attack' },
  eval_powershell_001: { zh: '混淆 PowerShell 恶意命令执行', en: 'Obfuscated PowerShell Execution' },
  eval_webshell_001: { zh: 'Webshell 网页后门脚本上载', en: 'Webshell Backdoor Script Upload' },
  eval_malicious_domain_001: { zh: 'DGA 动态域名通信（暗网中继）', en: 'DGA Domain Suspect Communication' },
  eval_lateral_movement_001: { zh: '内网主机纵向/横向渗透行为', en: 'Internal Endpoint Lateral Movement' },
  eval_false_positive_001: { zh: '研发测试场景良性业务误报', en: 'Benign False Positive' },

  ssh_brute_force: { zh: 'SSH 登录暴力破解攻击', en: 'SSH Logon Brute Force Attack' },
  obfuscated_powershell: { zh: '混淆 PowerShell 恶意命令执行', en: 'Obfuscated PowerShell Execution' },
  webshell_upload: { zh: 'Webshell 网页后门脚本上载', en: 'Webshell Backdoor Script Upload' },
  dga_domain: { zh: 'DGA 动态域名通信（暗网中继）', en: 'DGA Domain Suspect Communication' },
  lateral_movement: { zh: '内网主机纵向/横向渗透行为', en: 'Internal Endpoint Lateral Movement' },
  data_exfiltration: { zh: '敏感业务数据向外泄露逃逸', en: 'Sensitive Enterprise Data Exfiltration' },
  false_positive: { zh: '研发测试场景良性业务误报', en: 'Benign False Positive' }
};

const categoryNames: Record<string, { zh: string; en: string }> = {
  credential_access: { zh: '凭据盗取与破解', en: 'Credential Access' },
  execution: { zh: '恶意命令与脚本', en: 'Script Execution' },
  web_intrusion: { zh: 'Web 漏洞与后门', en: 'Web Intrusion' },
  command_and_control: { zh: '命令控制信道', en: 'Command & Control' },
  lateral_movement: { zh: '内网横向移动', en: 'Lateral Movement' },
  false_positive: { zh: '研发测试误报', en: 'False Positive' }
};

const severityMap: Record<string, string> = {
  critical: '紧急',
  high: '高危',
  medium: '中危',
  low: '低危'
};

const mitreMap: Record<string, string> = {
  'credential-access': '凭据盗取',
  'credential_access': '凭据盗取',
  'execution': '恶意命令执行',
  'initial-access': '初始访问',
  'initial_access': '初始访问',
  'command-and-control': '命令与控制',
  'command_and_control': '命令与控制',
  'lateral-movement': '横向移动',
  'lateral_movement': '横向移动',
  'defense-evasion': '防御绕过',
  'defense_evasion': '防御绕过',
  'exfiltration': '数据外泄',
  'T1110': '凭据暴力破解',
  'T1059.001': '恶意脚本执行',
  'T1505.003': 'Webshell 后门植入',
  'T1071.001': 'Web 通信信道',
  'T1021.002': '局域网共享横向渗透',
  'T1021.006': '系统服务横向渗透'
};

export default function EvalsDashboardPage() {
  const { language, t } = useLanguage();
  const [evalRun, setEvalRun] = useState<EvalRunSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEvaluation = useCallback(async () => {
    try {
      setRunning(true);
      setError(null);

      const [alertsResult, summary] = await Promise.all([
        api.getAlerts()
          .then(data => ({ data, error: null }))
          .catch((err: unknown) => ({
            data: null,
            error: err instanceof Error ? err.message : 'Alert API unavailable',
          })),
        api.runEvals()
      ]);
      setAlerts(alertsResult.data?.items || []);
      setAlertsError(alertsResult.error);
      setEvalRun(summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === 'zh' ? '触发自动化研判评估套件故障。' : 'Failed to launch automated evaluation suite.'));
    } finally {
      setRunning(false);
    }
  }, [language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void runEvaluation();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [runEvaluation]);

  // Threat severity calculations for HUD Card 1
  const realCritical = alerts.filter(a => a.severity === 'critical').length;
  const realHigh = alerts.filter(a => a.severity === 'high').length;
  const realMedium = alerts.filter(a => a.severity === 'medium').length;
  const realLow = alerts.filter(a => a.severity === 'low').length;
  const totalAlerts = alerts.length;
  const criticalCount = realCritical;
  const highCount = realHigh;
  const mediumCount = realMedium;
  const lowCount = realLow;
  const displayTotalAlerts = totalAlerts;
  const severityPercent = (count: number) => (
    displayTotalAlerts === 0 ? 0 : Math.round(count / displayTotalAlerts * 100)
  );

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-[#FCFAF6] font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#EAE9E4] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#6B6D70] uppercase">
            <span>{language === 'zh' ? '威胁研判与效能评估' : 'Threat Analysis & Investigation Performance'}</span>
          </div>
          <h2 className="text-xl font-semibold text-[#1E2022] tracking-tight mt-1 font-serif">
            {t('evals', 'title')}
          </h2>
          <p className="text-sm text-[#6B6D70] mt-2 font-sans max-w-3xl">
            {t('evals', 'subtitle')}
          </p>
        </div>

        <button
          disabled={running}
          onClick={runEvaluation}
          className="flex items-center gap-2 px-4 py-2.5 rounded border border-[#EAE9E4] bg-white hover:bg-[#F5F3EB] hover:border-[#D1CDC2] text-[#1E2022] font-mono text-xs font-semibold transition-all disabled:opacity-50 select-none cursor-pointer active:scale-98"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#C2593F]" />
              <span className="text-xs text-[#6B6D70]">{t('evals', 'btnRunning')}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-[#C2593F]" />
              <span>{t('evals', 'btnTrigger')}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="glass-panel p-5 rounded border-l-4 border-l-[#B83C25] border-[#EAE9E4] bg-white flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B83C25] flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-[#1E2022] font-mono">{t('evals', 'errorTitle')}</h4>
            <p className="text-sm text-[#6B6D70] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {evalRun && (
        <div className="space-y-8">

          {/* Top Analytic HUD Widgets */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* HUD Card 1: Severity Distribution */}
            <div className="glass-panel p-6 rounded border border-[#EAE9E4] bg-white flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider block">
                    {t('evals', 'cardSeverityTitle')}
                  </span>
                  <span className="text-xs text-[#6B6D70] font-mono">
                    {t('evals', 'cardSeverityTotal')}: <strong className="text-[#1E2022] font-bold">{displayTotalAlerts}</strong>
                  </span>
                </div>
                <p className="text-xs text-[#6B6D70] mt-1 font-sans">
                  {t('evals', 'cardSeveritySubtitle')}
                </p>
                {alertsError && (
                  <p className="text-xs text-[#B83C25] mt-2 font-sans">
                    {language === 'zh'
                      ? `告警数据源不可用：${alertsError}。下方分布不使用样例基线兜底。`
                      : `Alert data source unavailable: ${alertsError}. The distribution below does not use sample fallback values.`}
                  </p>
                )}
              </div>

              {/* Horizontal Stacked Bar / Mini Bars */}
              <div className="mt-4 space-y-2">
                {/* Mini bar for Critical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#B83C25] font-semibold">{language === 'zh' ? '紧急' : 'Critical'}</span>
                    <span className="text-[#4A4B4D]">{criticalCount} ({severityPercent(criticalCount)}%)</span>
                  </div>
                  <div className="w-full bg-[#FCFAF6] border border-[#EAE9E4] h-2 rounded overflow-hidden">
                    <div
                      className="bg-[#B83C25] h-full transition-all duration-500"
                      style={{ width: `${severityPercent(criticalCount)}%` }}
                    />
                  </div>
                </div>

                {/* Mini bar for High */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#C2593F] font-semibold">{language === 'zh' ? '高危' : 'High'}</span>
                    <span className="text-[#4A4B4D]">{highCount} ({severityPercent(highCount)}%)</span>
                  </div>
                  <div className="w-full bg-[#FCFAF6] border border-[#EAE9E4] h-2 rounded overflow-hidden">
                    <div
                      className="bg-[#C2593F] h-full transition-all duration-500"
                      style={{ width: `${severityPercent(highCount)}%` }}
                    />
                  </div>
                </div>

                {/* Mini bar for Medium */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#D69E2E] font-semibold">{language === 'zh' ? '中危' : 'Medium'}</span>
                    <span className="text-[#4A4B4D]">{mediumCount} ({severityPercent(mediumCount)}%)</span>
                  </div>
                  <div className="w-full bg-[#FCFAF6] border border-[#EAE9E4] h-2 rounded overflow-hidden">
                    <div
                      className="bg-[#D69E2E] h-full transition-all duration-500"
                      style={{ width: `${severityPercent(mediumCount)}%` }}
                    />
                  </div>
                </div>

                {/* Mini bar for Low */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#718096] font-semibold">{language === 'zh' ? '低危' : 'Low'}</span>
                    <span className="text-[#4A4B4D]">{lowCount} ({severityPercent(lowCount)}%)</span>
                  </div>
                  <div className="w-full bg-[#FCFAF6] border border-[#EAE9E4] h-2 rounded overflow-hidden">
                    <div
                      className="bg-[#718096] h-full transition-all duration-500"
                      style={{ width: `${severityPercent(lowCount)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* HUD Card 2: AI Coprocessor Efficiency */}
            <div className="glass-panel p-6 rounded border border-[#EAE9E4] flex flex-col justify-between bg-white">
              <div>
                <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider block">
                  {t('evals', 'cardEfficiencyTitle')}
                </span>
                <p className="text-xs text-[#6B6D70] mt-1 font-sans">
                  {t('evals', 'cardEfficiencySubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#EAE9E4]/60">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-[#6B6D70] block">
                    {t('evals', 'cardEfficiencyAvg')}
                  </span>
                  <h3 className="text-xl font-bold text-[#1E2022] font-mono">
                    {t('evals', 'cardEfficiencyVal')}
                  </h3>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-[#6B6D70] block">
                    {t('evals', 'cardEfficiencyClose')}
                  </span>
                  <h3 className="text-xl font-bold text-[#C2593F] font-mono">
                    {t('evals', 'cardEfficiencyCloseVal')}
                  </h3>
                </div>
              </div>

              <div className="text-[11px] leading-relaxed text-[#5C5E61] font-sans mt-3 bg-[#FCFAF6] p-2 rounded border border-[#EAE6DE]/70">
                {language === 'zh'
                  ? '覆盖暴力破解、可疑PowerShell、Webshell、恶意域名、内网横向、信息外泄 6 大攻防场景研判校验。'
                  : 'Covers ssh brute force, obfuscated powershell, webshell upload, dga domain, lateral movement, and data exfiltration.'}
              </div>
            </div>

            {/* HUD Card 3: Mitigation Execution Audit */}
            <div className="glass-panel p-6 rounded border border-[#EAE9E4] flex flex-col justify-between bg-white">
              <div>
                <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider block">
                  {t('evals', 'cardMitigationTitle')}
                </span>
                <p className="text-xs text-[#6B6D70] mt-1 font-sans">
                  {t('evals', 'cardMitigationSubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t border-[#EAE9E4]/60">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-[#6B6D70] block">
                    {t('evals', 'cardMitigationBlocked')}
                  </span>
                  <h3 className="text-xl font-bold text-[#B83C25] font-mono">
                    {t('evals', 'cardMitigationBlockedVal')}
                  </h3>
                </div>
              </div>

              <div className="text-[11px] leading-relaxed text-[#5C5E61] font-sans mt-3 bg-[#FCFAF6] p-2 rounded border border-[#EAE6DE]/70">
                {language === 'zh'
                  ? 'AI 协处理器基于多维线索深度分析抓取入侵事实，自动对齐攻击战术并完成安全判定闭环。'
                  : 'AI coprocessor reconstructs attack paths, aligns tactics, and locks forensic evidence for safe investigation closing.'}
              </div>
            </div>

          </div>

          {/* Test Case Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C2593F]" />
              <h3 className="text-sm font-semibold text-[#1E2022] tracking-wider uppercase font-mono">
                {t('evals', 'sectionCasesTitle')}
              </h3>
            </div>

            {/* Grid of Grader Cases */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {evalRun.cases.map((c) => {
                const caseNameInfo = caseNames[c.case_id] || { zh: c.case_id, en: c.case_id };
                const displayCaseName = language === 'zh' ? caseNameInfo.zh : caseNameInfo.en;

                // Define 6 threat reconstruction elements for multi-dimensional analysis validation
                const complianceItems = [
                  {
                    key: 'severity',
                    pass: c.severity_match,
                    label: language === 'zh' ? '威胁级别判定' : 'Severity Verdict',
                    desc: language === 'zh'
                      ? `预期级别: ${severityMap[c.expected_severity] || c.expected_severity} • 实际判定: ${severityMap[c.actual_severity] || c.actual_severity}`
                      : `Expected: ${c.expected_severity.toUpperCase()} • Actual: ${c.actual_severity.toUpperCase()}`
                  },
                  {
                    key: 'category',
                    pass: c.category_match,
                    label: language === 'zh' ? '威胁类型判定' : 'Threat Category',
                    desc: language === 'zh'
                      ? `预期分类: ${categoryNames[c.expected_category]?.zh || c.expected_category} • 实际判定: ${categoryNames[c.actual_category]?.zh || c.actual_category}`
                      : `Expected: ${c.expected_category} • Actual: ${c.actual_category}`
                  },
                  {
                    key: 'mitre',
                    pass: c.mitre_match,
                    label: language === 'zh' ? '攻防路径还原' : 'MITRE Mapping',
                    desc: language === 'zh'
                      ? `预期战术: ${(c.expected_mitre || []).map(m => mitreMap[m] || m).join(', ') || '无'} • 实际判定: ${(c.actual_mitre || []).map(m => mitreMap[m] || m).join(', ') || '无'}`
                      : `Expected MITRE: ${(c.expected_mitre || []).join(',') || 'None'} • Actual: ${(c.actual_mitre || []).join(',') || 'None'}`
                  },
                  {
                    key: 'tools',
                    pass: c.tool_call_match,
                    label: language === 'zh' ? '取证深度结论' : 'Deep Forensics',
                    desc: language === 'zh'
                      ? '多维度日志深度取证与溯源分析，完整还原威胁发生现场证据'
                      : 'Multi-dimensional log forensics and trace analysis to secure threat evidence'
                  },
                  {
                    key: 'approval',
                    pass: c.approval_match,
                    label: language === 'zh' ? '响应处置结果' : 'Response Align',
                    desc: c.requires_approval
                      ? (language === 'zh' ? '高风险威胁研判结果确凿，响应处置动作与威胁事实完全对齐并实现闭环' : 'High-risk threat verdict aligns with containment response actions')
                      : (language === 'zh' ? '经深度判定威胁不成立，事件安全闭环，无需执行额外阻断措施' : 'Low-risk anomaly requires no mitigation, verdict safely closed')
                  },
                  {
                    key: 'evidence',
                    pass: c.report_evidence_match,
                    label: language === 'zh' ? '证据固化结果' : 'Evidence Secured',
                    desc: language === 'zh'
                      ? '事件分析判定报告中已完整固化终端及网络侧取证的全部证据链条'
                      : 'Incident report successfully generated with a solid, complete forensic evidence chain'
                  }
                ];

                const isFalsePositive = c.actual_category === 'false_positive';
                let badgeColorClass = 'text-[#718096] bg-[#F7FAFC] border-[#E2E8F0]';
                let badgeLabel = language === 'zh' ? '良性业务误报' : 'Benign False Positive';

                if (!isFalsePositive) {
                  badgeLabel = language === 'zh' ? '确认安全威胁' : 'Confirmed Threat';
                  if (language === 'zh') {
                    badgeColorClass = 'text-[#B83C25] bg-[#FCF1EE] border-[#FADCD5]';
                  } else {
                    if (c.actual_severity === 'critical') {
                      badgeColorClass = 'text-[#B83C25] bg-[#FCF1EE] border-[#FADCD5]';
                    } else if (c.actual_severity === 'high') {
                      badgeColorClass = 'text-[#C2593F] bg-[#FFF2EE] border-[#FFE2D9]';
                    } else if (c.actual_severity === 'medium') {
                      badgeColorClass = 'text-[#D69E2E] bg-[#FFFBEB] border-[#FEF3C7]';
                    }
                  }
                }

                let hoverBorderClass = 'hover:border-[#8C8E91]';
                if (!isFalsePositive) {
                  if (c.actual_severity === 'critical') hoverBorderClass = 'hover:border-[#B83C25]';
                  else if (c.actual_severity === 'high') hoverBorderClass = 'hover:border-[#C2593F]';
                  else if (c.actual_severity === 'medium') hoverBorderClass = 'hover:border-[#D69E2E]';
                }

                return (
                  <div
                    key={c.case_id}
                    className={`glass-panel border border-[#EAE9E4] rounded overflow-hidden bg-white transition-all duration-200 ${hoverBorderClass}`}
                  >
                    {/* Case Top Bar */}
                    <div className="p-5 border-b border-[#EAE9E4]/60 flex justify-between items-center bg-[#FAFAF8]">
                      <div className="space-y-1 font-mono">
                        <span className="text-xs font-bold text-[#6B6D70] tracking-widest uppercase block">
                          {t('evals', 'caseLabel')}: <strong className="text-[#C2593F] font-bold">{displayCaseName}</strong>
                        </span>
                        <h4 className="text-[11px] text-[#8C8E91] select-all">
                          {language === 'zh' ? '对应告警 ID' : 'Alert ID'}: {c.alert_id}
                        </h4>
                      </div>

                      <div>
                        <span className={`${
                          (badgeLabel === '确认安全威胁' && language === 'zh') ? 'text-xs px-2.5 py-0.5' : 'text-[10px] px-2 py-0.5'
                        } font-bold font-mono rounded border uppercase select-none ${badgeColorClass}`}>
                          {badgeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="p-5 space-y-4">

                      {/* Safety Investigation Outcome Badges */}
                      <div className="grid grid-cols-3 gap-4 border-b border-[#EAE9E4]/40 pb-4">

                        {/* 1. Assessed Severity */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8E91] block">
                            {language === 'zh' ? '判定严重等级' : 'Severity'}
                          </span>
                          <div>
                            <span className={`inline-flex items-center text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase select-none ${
                              c.actual_severity === 'critical' ? 'text-[#B83C25] bg-[#FCF1EE] border-[#FADCD5]' :
                              c.actual_severity === 'high' ? 'text-[#C2593F] bg-[#FFF2EE] border-[#FFE2D9]' :
                              c.actual_severity === 'medium' ? 'text-[#D69E2E] bg-[#FFFBEB] border-[#FEF3C7]' :
                              'text-[#718096] bg-[#F7FAFC] border-[#E2E8F0]'
                            }`}>
                              {language === 'zh'
                                ? (severityMap[c.actual_severity] || c.actual_severity)
                                : c.actual_severity.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* 2. Threat Category */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8E91] block">
                            {language === 'zh' ? '安全威胁分类' : 'Category'}
                          </span>
                          <span className="text-xs font-semibold text-[#1E2022] font-mono block truncate" title={c.actual_category}>
                            {language === 'zh'
                              ? (categoryNames[c.actual_category]?.zh || c.actual_category)
                              : (categoryNames[c.actual_category]?.en || c.actual_category)}
                          </span>
                        </div>

                        {/* 3. Verdict Analysis Outcome */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8E91] block">
                            {language === 'zh' ? '分析研判结论' : 'Verdict'}
                          </span>
                          <div className="truncate">
                            {isFalsePositive ? (
                              <span className="text-[#2E7D32] font-semibold text-xs inline-flex items-center gap-1">
                                ✔ {language === 'zh' ? '良性业务误报 (安全闭环)' : 'Benign Anomaly'}
                              </span>
                            ) : (
                              <span className="text-[#B83C25] font-semibold text-xs inline-flex items-center gap-1">
                                ⚠️ {language === 'zh' ? '确证安全威胁 (已固化证据)' : 'Confirmed Threat'}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* AI Investigation Diagnostics Evidence Logs */}
                      <div className="p-4 bg-[#FAF9F5] border border-[#E1DEC9] rounded-md space-y-2 relative">
                        <div className="absolute top-2.5 right-3 text-[10px] font-bold font-mono text-[#8C8E91] select-none uppercase tracking-widest">
                          {language === 'zh' ? '研判结论与取证证据' : 'AI Forensics Evidence'}
                        </div>
                        <div className="text-xs font-bold text-[#4A4B4D] border-b border-[#EAE9E4] pb-1.5 mb-2 flex items-center gap-1.5 uppercase font-mono">
                          <span>📋 {language === 'zh' ? '事件研判分析报告与追踪轨迹' : 'Incident Investigation Report & Forensics Trace'}</span>
                        </div>
                        <p className="font-sans leading-relaxed text-sm text-[#2A2B2D] whitespace-pre-line text-left">
                          {language === 'zh' ? c.diagnostics : (c.diagnostics_en || c.diagnostics)}
                        </p>
                      </div>

                      {/* Micro Compliance Footer (Grader Audits) */}
                      <div className="pt-3 border-t border-[#EAE9E4]/60 flex flex-col gap-3 text-[11px] text-[#6B6D70] font-mono">
                        <div className="flex flex-col gap-1.5">
                          <div className="font-bold text-[10px] uppercase text-[#8C8E91] tracking-wider">
                            {language === 'zh' ? '威胁多维分析结果校验' : 'Multi-dimensional Threat Analysis Verification'}:
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {complianceItems.map((item) => (
                              <span
                                key={item.key}
                                className="inline-flex items-center gap-1 select-none cursor-help"
                                title={`${item.label}: ${item.desc}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${item.pass ? 'bg-[#2E7D32]' : 'bg-[#B83C25]'}`} />
                                <span className={`text-[11px] ${item.pass ? 'text-[#4A4B4D]' : 'text-[#B83C25] font-semibold'}`}>
                                  {item.label}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-[13px] font-bold text-[#8C8E91]">
                          <div className="mb-0.5">{language === 'zh' ? '威胁研判结论:' : 'Verdict Analysis Quality:'}</div>
                          <div className={c.passed ? 'text-[#2E7D32]' : 'text-[#B83C25]'}>
                            {c.passed
                              ? (language === 'zh' ? '研判结论确凿且证据完整' : 'Accurate Verdict & Secured Evidence')
                              : (language === 'zh' ? '研判结论存疑待专家复核' : 'Verdict Suspicious - Analyst Review Required')}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Empty State when no evaluation is run */}
      {!evalRun && !running && (
        <div className="glass-panel p-16 rounded border border-[#EAE9E4] text-center flex flex-col items-center justify-center gap-4 bg-white">
          <Workflow className="w-12 h-12 text-[#6B6D70] opacity-60" />
          <h4 className="text-base font-semibold text-[#1E2022] uppercase tracking-widest font-mono">
            {t('evals', 'suiteReadyTitle')}
          </h4>
          <p className="text-sm text-[#6B6D70] max-w-lg font-sans">
            {t('evals', 'suiteReadyDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
