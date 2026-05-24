'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, DatabaseZap, Filter, RefreshCw, Search } from 'lucide-react';
import { api, type SecurityLogEvent } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const defaultFilters = {
  alert_id: '',
  host: '',
  username: '',
  src_ip: '',
  event_type: '',
  limit: '100',
};

const eventTypeLabels: Record<string, { zh: string; en: string }> = {
  auth: { zh: '认证', en: 'Auth' },
  process: { zh: '进程', en: 'Process' },
  web: { zh: 'Web', en: 'Web' },
  network: { zh: '网络', en: 'Network' },
  dns: { zh: 'DNS', en: 'DNS' },
  file: { zh: '文件', en: 'File' },
};

export default function SecurityLogsPage() {
  const { language } = useLanguage();
  const [filters, setFilters] = useState(defaultFilters);
  const [events, setEvents] = useState<SecurityLogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    return Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value.trim() !== ''),
    );
  }, [filters]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSecurityLogs(query);
      setEvents(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security logs');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLogs();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadLogs]);

  const updateFilter = (key: keyof typeof defaultFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-6 flex flex-col gap-4 border-b pb-6 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <DatabaseZap className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '原始证据检索' : 'Raw Evidence Search'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '原始安全日志探索' : 'Security Log Explorer'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '检索本地样例安全日志，围绕告警 ID、主机、账户和源 IP 直接下钻原始证据。'
              : 'Search local sample telemetry by alert, host, account, and source IP for direct evidence review.'}
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
          {language === 'zh' ? '重新检索' : 'Refresh'}
        </button>
      </header>

      <section className="sp-panel mb-6 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider sp-muted">
          <Filter className="h-4 w-4 sp-accent" />
          {language === 'zh' ? '过滤条件' : 'Filters'}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterInput label={language === 'zh' ? '告警 ID' : 'Alert ID'} value={filters.alert_id} onChange={(value) => updateFilter('alert_id', value)} />
          <FilterInput label={language === 'zh' ? '主机' : 'Host'} value={filters.host} onChange={(value) => updateFilter('host', value)} />
          <FilterInput label={language === 'zh' ? '账户' : 'Username'} value={filters.username} onChange={(value) => updateFilter('username', value)} />
          <FilterInput label={language === 'zh' ? '源 IP' : 'Source IP'} value={filters.src_ip} onChange={(value) => updateFilter('src_ip', value)} />
          <FilterInput label={language === 'zh' ? '类型' : 'Type'} value={filters.event_type} onChange={(value) => updateFilter('event_type', value)} />
          <FilterInput label={language === 'zh' ? '数量' : 'Limit'} value={filters.limit} onChange={(value) => updateFilter('limit', value)} />
        </div>
      </section>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="sp-panel">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--sp-border)' }}>
          <div className="flex items-center gap-2 text-sm font-semibold sp-text">
            <Search className="h-4 w-4 sp-accent" />
            {language === 'zh' ? '检索结果' : 'Results'}
          </div>
          <span className="font-mono text-xs sp-muted">
            {events.length} / {total}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider sp-muted" style={{ background: 'var(--sp-surface-soft)' }}>
              <tr>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '时间' : 'Time'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '告警' : 'Alert'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '类型' : 'Type'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '主机' : 'Host'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '来源' : 'Source'}</th>
                <th className="px-5 py-3 font-semibold">{language === 'zh' ? '日志内容' : 'Message'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#6B6D70]">
                    {loading
                      ? (language === 'zh' ? '正在读取原始日志...' : 'Loading raw events...')
                      : (language === 'zh' ? '没有匹配的日志。调整过滤条件后重新检索。' : 'No matching events. Adjust filters and search again.')}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      className="sp-row-hover cursor-pointer align-top transition-colors"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{event.event_time}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-text">{event.alert_id}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded border px-2 py-1 font-mono text-[10px] uppercase sp-status-warning">
                          {eventTypeLabel(event.log_type, language)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sp-text">{event.host || '-'}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs sp-muted">{event.src_ip || event.username || '-'}</td>
                      <td className="max-w-[420px] truncate px-5 py-4 sp-text">{event.message}</td>
                    </tr>
                    {expandedId === event.id && (
                      <tr>
                        <td colSpan={6} className="px-5 py-4" style={{ background: 'var(--sp-sidebar)' }}>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-wider sp-muted">
                              {language === 'zh' ? '原始 JSON' : 'Raw JSON'}
                            </span>
                            <button
                              onClick={() => void navigator.clipboard.writeText(JSON.stringify(event, null, 2))}
                              className="sp-hoverable inline-flex items-center gap-2 rounded border px-2 py-1 text-xs transition-colors"
                              style={{ borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {language === 'zh' ? '复制' : 'Copy'}
                            </button>
                          </div>
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 sp-text">
                            {JSON.stringify(event, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold tracking-wide sp-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded border px-3 text-sm outline-none transition-colors focus:bg-[var(--sp-surface)]"
        style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
      />
    </label>
  );
}

function eventTypeLabel(type: string, language: 'zh' | 'en') {
  return eventTypeLabels[type.toLowerCase()]?.[language] ?? type;
}
