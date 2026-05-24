'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, GitBranch, RefreshCw } from 'lucide-react';
import { api, type Investigation } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const statusLabels: Record<Investigation['status'], { zh: string; en: string }> = {
  created: { zh: '已创建', en: 'Created' },
  running: { zh: '运行中', en: 'Running' },
  waiting_approval: { zh: '待审批', en: 'Waiting Approval' },
  completed: { zh: '已完成', en: 'Completed' },
  failed: { zh: '失败', en: 'Failed' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
};

export default function InvestigationsPage() {
  const { language } = useLanguage();
  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getInvestigations({ limit: '100' });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investigations');
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
      running: items.filter((item) => item.status === 'running').length,
      waiting: items.filter((item) => item.status === 'waiting_approval').length,
      completed: items.filter((item) => item.status === 'completed').length,
    };
  }, [items]);

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <GitBranch className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '研判作业台' : 'Investigation Desk'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '研判任务' : 'Investigations'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '集中查看已经创建的告警研判任务、运行状态、风险结论和最新更新时间。'
              : 'Review created investigation jobs, execution state, risk conclusions, and latest updates.'}
          </p>
        </div>
        <button onClick={loadItems} disabled={loading} className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
          {language === 'zh' ? '刷新任务' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label={language === 'zh' ? '任务总数' : 'Total'} value={counts.total} />
        <Metric label={language === 'zh' ? '运行中' : 'Running'} value={counts.running} />
        <Metric label={language === 'zh' ? '待审批' : 'Waiting'} value={counts.waiting} />
        <Metric label={language === 'zh' ? '已完成' : 'Completed'} value={counts.completed} />
      </section>

      <section className="sp-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider sp-muted" style={{ background: 'var(--sp-surface-soft)' }}>
              <tr>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '任务 ID' : 'ID'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '告警' : 'Alert'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '状态' : 'Status'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '严重级别' : 'Severity'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '分类' : 'Category'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '更新时间' : 'Updated'}</th>
                <th className="px-5 py-3 text-right font-semibold">{language === 'zh' ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm sp-muted">
                    {loading ? (language === 'zh' ? '正在读取研判任务...' : 'Loading investigations...') : (language === 'zh' ? '暂无研判任务。可从安全告警收件箱启动研判。' : 'No investigations yet. Start one from the alert inbox.')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="sp-row-hover transition-colors">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-text">{item.id}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{item.alert_id}</td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={item.status} language={language} /></td>
                    <td className="whitespace-nowrap px-5 py-4 sp-text">{item.severity}</td>
                    <td className="whitespace-nowrap px-5 py-4 sp-muted">{item.category}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{formatTime(item.updated_at, language)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link href={`/investigations/detail?id=${encodeURIComponent(item.id)}`} className="text-xs font-semibold sp-accent">
                        {language === 'zh' ? '查看详情' : 'Open'}
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

function StatusBadge({ status, language }: { status: Investigation['status']; language: 'zh' | 'en' }) {
  const label = statusLabels[status]?.[language] ?? status;
  const className = status === 'completed'
    ? 'sp-status-online'
    : status === 'failed' || status === 'cancelled'
      ? 'sp-status-danger'
      : status === 'waiting_approval'
        ? 'sp-status-warning'
        : 'sp-status-muted';
  return <span className={`rounded border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatTime(value: string, language: 'zh' | 'en') {
  return new Date(value).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false });
}
