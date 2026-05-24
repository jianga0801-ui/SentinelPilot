'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { api, type DashboardSummary } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { translateFrom, translations } from '@/lib/translations';

const timelineTypeLabels: Record<string, { zh: string; en: string }> = {
  approval_created: { zh: '触发审批', en: 'Approval Created' },
  approval_decision: { zh: '审批结果', en: 'Approval Decision' },
  report_created: { zh: '生成报告', en: 'Report Created' },
  tool_call: { zh: '工具调用', en: 'Tool Call' },
  tool_result: { zh: '工具结果', en: 'Tool Result' },
  agent_message: { zh: '研判消息', en: 'Agent Message' },
  error: { zh: '异常', en: 'Error' },
};

const timelineTextLabels: Record<string, { zh: string; en: string }> = {
  'Approval required': { zh: '需要人工审批', en: 'Approval required' },
  'Approval decision recorded': { zh: '审批决策已记录', en: 'Approval decision recorded' },
  'Report created': { zh: '报告已生成', en: 'Report created' },
  'search_knowledge_base result': { zh: '知识库检索结果', en: 'search_knowledge_base result' },
  'Call search_knowledge_base': { zh: '调用知识库检索', en: 'Call search_knowledge_base' },
  'map_mitre_attack result': { zh: 'MITRE 映射结果', en: 'map_mitre_attack result' },
  'Call map_mitre_attack': { zh: '调用 MITRE 映射', en: 'Call map_mitre_attack' },
  'Suspicious source IP generated repeated failed logins and successful access.': {
    zh: '可疑源 IP 产生连续失败登录并出现成功访问。',
    en: 'Suspicious source IP generated repeated failed logins and successful access.',
  },
  'Final Markdown report was written.': {
    zh: '最终研判报告已生成。',
    en: 'Final Markdown report was written.',
  },
  'Tool search_knowledge_base returned successfully.': {
    zh: '知识库检索工具已成功返回。',
    en: 'Tool search_knowledge_base returned successfully.',
  },
  'Calling tool search_knowledge_base.': {
    zh: '正在调用知识库检索工具。',
    en: 'Calling tool search_knowledge_base.',
  },
  'Tool map_mitre_attack returned successfully.': {
    zh: 'MITRE 映射工具已成功返回。',
    en: 'Tool map_mitre_attack returned successfully.',
  },
  'Calling tool map_mitre_attack.': {
    zh: '正在调用 MITRE 映射工具。',
    en: 'Calling tool map_mitre_attack.',
  },
};

const severityLabels: Record<string, { zh: string; en: string }> = {
  low: { zh: '低危', en: 'Low' },
  medium: { zh: '中危', en: 'Medium' },
  high: { zh: '高危', en: 'High' },
  critical: { zh: '紧急', en: 'Critical' },
};

export default function DashboardPage() {
  const { language } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await api.getSystemDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: language === 'zh' ? '今日告警' : 'Today Alerts',
        value: summary.metrics.today_alerts,
        helper: language === 'zh' ? '来自当前归一化告警源' : 'From normalized alert source',
      },
      {
        label: language === 'zh' ? '高危告警' : 'High Risk',
        value: summary.metrics.high_risk_alerts,
        helper: language === 'zh' ? '高危 / 紧急队列' : 'High / critical queue',
      },
      {
        label: language === 'zh' ? '研判任务' : 'Investigations',
        value: summary.metrics.investigations_total,
        helper: language === 'zh' ? `${summary.metrics.investigations_running} 个运行中` : `${summary.metrics.investigations_running} running`,
      },
      {
        label: language === 'zh' ? '待审批' : 'Pending Approval',
        value: summary.metrics.pending_approvals,
        helper: language === 'zh' ? '高风险动作等待人工确认' : 'High-risk actions awaiting review',
      },
      {
        label: language === 'zh' ? '已完成报告' : 'Completed',
        value: summary.metrics.investigations_completed,
        helper: language === 'zh' ? '报告与证据链已闭环' : 'Reports and evidence closed',
      },
    ];
  }, [language, summary]);

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <Activity className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '运营控制台' : 'Operations Console'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '系统运行总览' : 'System Dashboard'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '集中查看告警、研判、审批、模型和通知渠道状态，作为进入日常安全运营的第一屏。'
              : 'A compact operational view of alerts, investigations, approvals, model access, and IM integration.'}
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
          {language === 'zh' ? '刷新状态' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && !summary ? (
        <DashboardSkeleton />
      ) : summary ? (
        <main className="space-y-7">
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-4" id="health">
            <HealthTile icon={Activity} label={language === 'zh' ? '后端服务' : 'Backend'} state={summary.health.backend.status} language={language} />
            <HealthTile icon={Database} label={language === 'zh' ? '数据库' : 'Database'} state={summary.health.database.status} language={language} />
            <HealthTile icon={Workflow} label={language === 'zh' ? '模型研判' : 'LLM'} state={summary.health.llm.status} language={language} />
            <HealthTile icon={MessageSquare} label={language === 'zh' ? '通知渠道' : 'Notifications'} state={summary.health.im.status} language={language} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" id="approvals">
            {metrics.map((metric) => (
              <div key={metric.label} className="sp-panel p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider sp-muted">
                  {metric.label}
                </div>
                <div className="mt-3 text-3xl font-semibold sp-text">
                  {metric.value}
                </div>
                <div className="mt-2 text-xs leading-5 sp-muted">{metric.helper}</div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]" id="timeline">
            <div className="sp-panel">
              <SectionTitle
                icon={<Clock3 className="h-4 w-4" />}
                title={language === 'zh' ? '最近研判时间线' : 'Recent Timeline'}
                action={<Link href="/alerts" className="text-xs font-semibold text-[#C2593F] hover:underline">{language === 'zh' ? '进入告警' : 'Open Alerts'}</Link>}
              />
              <div className="divide-y divide-[#F0EDE8]">
                {summary.recent_timeline.length === 0 ? (
                  <EmptyRow text={language === 'zh' ? '暂无研判时间线。启动一次告警研判后，这里会显示工具调用、审批和报告事件。' : 'No timeline events yet. Start an investigation to populate this feed.'} />
                ) : (
                  summary.recent_timeline.map((item) => (
                    <div key={item.id} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 px-5 py-4">
                      <span className="font-mono text-[11px] uppercase sp-muted">{timelineTypeLabel(item.type, language)}</span>
                      <div>
                        <div className="text-sm font-semibold sp-text">{timelineText(item.title, language)}</div>
                        <p className="mt-1 truncate text-xs sp-muted">{timelineText(item.content, language)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sp-panel">
              <SectionTitle
                icon={<ShieldAlert className="h-4 w-4" />}
                title={language === 'zh' ? '高危告警队列' : 'High-risk Queue'}
                action={<Link href="/logs/security" className="text-xs font-semibold text-[#C2593F] hover:underline">{language === 'zh' ? '查日志' : 'Inspect Logs'}</Link>}
              />
              <div className="divide-y divide-[#F0EDE8]">
                {summary.recent_high_risk_alerts.length === 0 ? (
                  <EmptyRow text={language === 'zh' ? '当前没有高危或紧急告警。' : 'No high or critical alerts in the queue.'} />
                ) : (
                  summary.recent_high_risk_alerts.map((alert) => (
                    <Link key={alert.id} href={`/alerts/detail?id=${encodeURIComponent(alert.id)}`} className="sp-row-hover block px-5 py-4 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold sp-text">
                          {language === 'zh' ? translateFrom(translations.mockAlerts, alert.title, language, alert.title) : alert.title}
                        </span>
                        <span className="rounded border px-2 py-1 font-mono text-[10px] uppercase sp-status-warning">
                          {severityLabel(alert.severity, language)}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] sp-muted">{alert.id}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      ) : null}
    </div>
  );
}

function HealthTile({ icon: Icon, label, state, language }: { icon: LucideIcon; label: string; state: string; language: 'zh' | 'en' }) {
  const online = state === 'online';
  return (
    <div className={`sp-panel flex items-center justify-between px-5 py-4 ${online ? 'shadow-[0_0_0_1px_var(--sp-success-soft)_inset]' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={online ? 'sp-accent' : 'sp-muted'}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold sp-text">{label}</span>
      </div>
      <span className={`inline-flex h-6 min-w-16 items-center justify-center gap-1.5 rounded border px-2 font-mono text-[10px] uppercase ${online ? 'sp-status-online' : 'sp-status-disabled'}`}>
        {online && <CheckCircle2 className="h-3 w-3" />}
        {stateLabel(state, language)}
      </span>
    </div>
  );
}

function stateLabel(state: string, language: 'zh' | 'en') {
  const labels: Record<string, { zh: string; en: string }> = {
    online: { zh: '在线', en: 'Online' },
    offline: { zh: '离线', en: 'Offline' },
    disabled: { zh: '未启用', en: 'Disabled' },
  };
  return labels[state]?.[language] ?? state;
}

function timelineTypeLabel(type: string, language: 'zh' | 'en') {
  return timelineTypeLabels[type.toLowerCase()]?.[language] ?? type;
}

function timelineText(text: string, language: 'zh' | 'en') {
  if (language === 'en') return text;
  if (timelineTextLabels[text]) return timelineTextLabels[text].zh;
  const approvalMatch = text.match(/^Approval (.+) was approved\.$/);
  if (approvalMatch) return `审批 ${approvalMatch[1]} 已通过。`;
  return text;
}

function severityLabel(severity: string, language: 'zh' | 'en') {
  return severityLabels[severity.toLowerCase()]?.[language] ?? severity;
}

function SectionTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--sp-border)' }}>
      <div className="flex items-center gap-2 text-sm font-semibold sp-text">
        <span className="sp-accent">{icon}</span>
        {title}
      </div>
      {action}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-sm sp-muted">{text}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse sp-panel-muted" />
        ))}
      </div>
      <div className="h-80 animate-pulse sp-panel-muted" />
    </div>
  );
}
