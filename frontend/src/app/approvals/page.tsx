'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ClipboardCheck, RefreshCw } from 'lucide-react';
import { api, type ApprovalListItem } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const statusLabels: Record<ApprovalListItem['status'], { zh: string; en: string }> = {
  pending: { zh: '待审批', en: 'Pending' },
  approved: { zh: '已通过', en: 'Approved' },
  rejected: { zh: '已拒绝', en: 'Rejected' },
};

const actionLabels: Record<ApprovalListItem['action_type'], { zh: string; en: string }> = {
  block_ip: { zh: '阻断 IP', en: 'Block IP' },
  isolate_host: { zh: '隔离主机', en: 'Isolate Host' },
  disable_user: { zh: '禁用账户', en: 'Disable User' },
  collect_artifact: { zh: '采集证据', en: 'Collect Artifact' },
  notify_owner: { zh: '通知负责人', en: 'Notify Owner' },
};

export default function ApprovalsPage() {
  const { language } = useLanguage();
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAllApprovals({ limit: '100' });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadItems();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadItems]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      approved: items.filter((item) => item.status === 'approved').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
    };
  }, [items]);

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <ClipboardCheck className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '人工确认台' : 'Human Review'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '审批队列' : 'Approval Queue'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '集中查看高风险动作审批记录，确认哪些动作仍在等待人工决策。'
              : 'Review high-risk action approvals and identify items still waiting for a human decision.'}
          </p>
        </div>
        <button onClick={loadItems} disabled={loading} className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
          {language === 'zh' ? '刷新队列' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label={language === 'zh' ? '审批总数' : 'Total'} value={counts.total} />
        <Metric label={language === 'zh' ? '待审批' : 'Pending'} value={counts.pending} />
        <Metric label={language === 'zh' ? '已通过' : 'Approved'} value={counts.approved} />
        <Metric label={language === 'zh' ? '已拒绝' : 'Rejected'} value={counts.rejected} />
      </section>

      <section className="sp-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider sp-muted" style={{ background: 'var(--sp-surface-soft)' }}>
              <tr>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '审批 ID' : 'Approval ID'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '动作' : 'Action'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '目标' : 'Target'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '风险' : 'Risk'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '状态' : 'Status'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '创建时间' : 'Created'}</th>
                <th className="px-5 py-3 text-right font-semibold">{language === 'zh' ? '关联任务' : 'Investigation'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm sp-muted">
                    {loading ? (language === 'zh' ? '正在读取审批队列...' : 'Loading approvals...') : (language === 'zh' ? '暂无审批记录。高风险研判动作会在这里生成审批项。' : 'No approvals yet. High-risk investigation actions will appear here.')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="sp-row-hover transition-colors">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-text">{item.id}</td>
                    <td className="whitespace-nowrap px-5 py-4 sp-text">{actionLabels[item.action_type]?.[language] ?? item.action_type}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{item.target}</td>
                    <td className="whitespace-nowrap px-5 py-4 sp-text">{item.risk_level}</td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={item.status} language={language} /></td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{formatTime(item.created_at, language)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link href={`/investigations/detail?id=${encodeURIComponent(item.investigation_id)}`} className="text-xs font-semibold sp-accent">
                        {item.investigation_id}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="sp-panel p-5">
      <div className="text-[11px] font-bold uppercase tracking-wider sp-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold sp-text">{value}</div>
    </div>
  );
}

function StatusBadge({ status, language }: { status: ApprovalListItem['status']; language: 'zh' | 'en' }) {
  const label = statusLabels[status]?.[language] ?? status;
  const className = status === 'approved'
    ? 'sp-status-online'
    : status === 'rejected'
      ? 'sp-status-danger'
      : 'sp-status-warning';
  return <span className={`rounded border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatTime(value: string, language: 'zh' | 'en') {
  return new Date(value).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false });
}
