'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, TerminalSquare } from 'lucide-react';
import { api, type ServiceLogEntry } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function ServiceLogsPage() {
  const { language } = useLanguage();
  const [items, setItems] = useState<ServiceLogEntry[]>([]);
  const [level, setLevel] = useState('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { limit: '200' };
      if (level !== 'ALL') params.level = level;
      if (query.trim()) params.q = query.trim();
      const result = await api.getServiceLogs(params);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service logs');
    } finally {
      setLoading(false);
    }
  }, [level, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadItems();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadItems]);

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <TerminalSquare className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '运行日志控制台' : 'Runtime Log Console'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '服务日志' : 'Service Logs'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '独立查看后端服务运行日志，按等级和关键词过滤运行状态、异常与集成调用记录。'
              : 'Inspect backend runtime logs with level and keyword filters for service, error, and integration records.'}
          </p>
        </div>
        <button onClick={loadItems} disabled={loading} className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
          {language === 'zh' ? '刷新日志' : 'Refresh'}
        </button>
      </header>

      <section className="sp-panel mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-wide sp-muted">{language === 'zh' ? '等级' : 'Level'}</span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-10 w-full rounded border px-3 text-sm outline-none transition-colors"
              style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
            >
              <option value="ALL">{language === 'zh' ? '全部' : 'All'}</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-wide sp-muted">{language === 'zh' ? '关键词' : 'Keyword'}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === 'zh' ? '过滤错误、模块名或请求路径...' : 'Filter errors, modules, or request paths...'}
              className="h-10 w-full rounded border px-3 text-sm outline-none transition-colors"
              style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="sp-panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--sp-border)' }}>
          <div className="flex items-center gap-2 text-sm font-semibold sp-text">
            <TerminalSquare className="h-4 w-4 sp-accent" />
            {language === 'zh' ? '日志记录' : 'Records'}
          </div>
          <span className="font-mono text-xs sp-muted">{items.length}</span>
        </div>
        <div className="divide-y divide-[#F0EDE8]">
          {items.length === 0 ? (
            <div className="px-5 py-10 text-sm sp-muted">
              {loading ? (language === 'zh' ? '正在读取服务日志...' : 'Loading service logs...') : (language === 'zh' ? '当前没有服务日志文件。启动后端并产生运行日志后，这里会显示最近记录。' : 'No service log file yet. Recent records will appear after the backend writes logs.')}
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-2 px-5 py-3 text-sm md:grid-cols-[100px_minmax(0,1fr)_190px]">
                <span className={`font-mono text-[11px] font-semibold uppercase ${levelClass(item.level)}`}>{item.level}</span>
                <span className="min-w-0 sp-text">{item.message}</span>
                <span className="font-mono text-[11px] sp-muted md:text-right">{item.created_at || '-'}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function levelClass(level: string) {
  if (level === 'ERROR') return 'text-[var(--sp-danger)]';
  if (level === 'WARNING') return 'text-[var(--sp-warning)]';
  if (level === 'INFO') return 'sp-accent';
  return 'sp-muted';
}
