'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Shield,
  Clock,
  ChevronRight,
  Database,
  AlertTriangle,
  Info,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { api, AlertListItem } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { translations, translateFrom } from '@/lib/translations';

const categoryNames: Record<string, { zh: string; en: string }> = {
  credential_access: { zh: '凭据盗取与破解', en: 'Credential Access' },
  authentication: { zh: '身份认证与爆破', en: 'Authentication' },
  execution: { zh: '恶意命令与脚本', en: 'Script Execution' },
  suspicious_powershell: { zh: '可疑 PowerShell', en: 'Suspicious PowerShell' },
  web_intrusion: { zh: 'Web 漏洞与后门', en: 'Web Intrusion' },
  command_and_control: { zh: '命令控制信道', en: 'Command & Control' },
  malicious_domain: { zh: '恶意域名通信', en: 'Malicious Domain' },
  lateral_movement: { zh: '内网横向移动', en: 'Lateral Movement' },
  data_exfiltration: { zh: '敏感数据外泄', en: 'Data Exfiltration' },
  false_positive: { zh: '研发测试误报', en: 'False Positive' }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'severity_desc'>('date_desc');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts();
      setAlerts(data?.items || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === 'zh' ? '无法加载安全告警列表，请确保后端服务正常运行。' : 'Failed to load security alerts. Please ensure the backend is running.'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAlerts();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchAlerts]);

  const categories = ['ALL', ...Array.from(new Set(alerts.map(a => a.category).filter(Boolean)))];

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          alert.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || alert.severity.toUpperCase() === severityFilter;
    const matchesCategory = categoryFilter === 'ALL' || alert.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'date_asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'severity_desc') {
      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const weightA = severityWeight[a.severity] || 0;
      const weightB = severityWeight[b.severity] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  const totalCount = alerts.length;
  const highCriticalCount = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;
  const lowCount = alerts.filter(a => a.severity === 'low').length;

  return (
    <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-[#EAE9E4] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#6B6D70] uppercase">
            <span>{t('alerts', 'breadcrumbHome')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#C2593F]">{t('alerts', 'breadcrumbList')}</span>
          </div>
          <h2 className="text-3xl font-serif font-black text-[#1E2022] tracking-tight mt-1">
            {t('alerts', 'title')}
          </h2>
          <p className="text-sm text-[#6B6D70] max-w-2xl leading-relaxed">
            {t('alerts', 'subtitle')}
          </p>
        </div>
        <div>
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#EAE9E4] rounded bg-white text-stone-700 hover:bg-[#F5F3EB] hover:text-[#1E2022] transition-colors duration-150 active:bg-[#EFECE3]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{language === 'zh' ? '同步数据' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAE9E4] p-5 rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase">
              {language === 'zh' ? '告警总数' : 'Total Alerts'}
            </span>
            <h3 className="text-2xl font-serif font-black text-[#1E2022] mt-1">{totalCount}</h3>
          </div>
          <div className="w-8 h-8 rounded bg-[#F5F3EB] flex items-center justify-center text-stone-600">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white border border-[#EAE9E4] p-5 rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase">
              {language === 'zh' ? '高危 / 紧急' : 'High / Critical'}
            </span>
            <h3 className="text-2xl font-serif font-black text-[#B83C25] mt-1">{highCriticalCount}</h3>
          </div>
          <div className="w-8 h-8 rounded bg-[#FCF1EE] flex items-center justify-center text-[#B83C25]">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white border border-[#EAE9E4] p-5 rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase">
              {language === 'zh' ? '中等风险' : 'Medium Risk'}
            </span>
            <h3 className="text-2xl font-serif font-black text-[#A37110] mt-1">{mediumCount}</h3>
          </div>
          <div className="w-8 h-8 rounded bg-[#FAF5E6] flex items-center justify-center text-[#A37110]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white border border-[#EAE9E4] p-5 rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase">
              {language === 'zh' ? '低风险 / 安全' : 'Low Risk / Safe'}
            </span>
            <h3 className="text-2xl font-serif font-black text-[#25633A] mt-1">{lowCount}</h3>
          </div>
          <div className="w-8 h-8 rounded bg-[#F0F6F1] flex items-center justify-center text-[#25633A]">
            <Info className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#F7F5EF] p-4 border border-[#EAE9E4] rounded">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder={t('alerts', 'searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-[#EAE9E4] bg-white rounded text-[#1E2022] placeholder-stone-400 focus:outline-none focus:border-[#C2593F] transition-colors duration-150"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-stone-600">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#EAE9E4] bg-white rounded text-stone-700 focus:outline-none focus:border-[#C2593F]"
            >
              <option value="ALL">{language === 'zh' ? '严重性: 全部' : 'Severity: All'}</option>
              <option value="CRITICAL">{language === 'zh' ? '严重性: 紧急' : 'Severity: Critical'}</option>
              <option value="HIGH">{language === 'zh' ? '严重性: 高危' : 'Severity: High'}</option>
              <option value="MEDIUM">{language === 'zh' ? '严重性: 中等' : 'Severity: Medium'}</option>
              <option value="LOW">{language === 'zh' ? '严重性: 低危' : 'Severity: Low'}</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#EAE9E4] bg-white rounded text-stone-700 focus:outline-none focus:border-[#C2593F]"
            >
              <option value="ALL">{language === 'zh' ? '分类: 全部' : 'Category: All'}</option>
              {categories.filter(c => c !== 'ALL').map(cat => (
                <option key={cat} value={cat}>
                  {language === 'zh' ? `分类: ${categoryNames[cat]?.zh || cat}` : `Category: ${categoryNames[cat]?.en || cat}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-stone-600">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#EAE9E4] bg-white rounded text-stone-700 focus:outline-none focus:border-[#C2593F]"
            >
              <option value="date_desc">{language === 'zh' ? '创建时间 (最新优先)' : 'Date (Newest First)'}</option>
              <option value="date_asc">{language === 'zh' ? '创建时间 (最早优先)' : 'Date (Oldest First)'}</option>
              <option value="severity_desc">{language === 'zh' ? '严重性 (从高到低)' : 'Severity (High to Low)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white border border-[#EAE9E4] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-[#F5F3EB]/60 rounded animate-pulse w-full"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <AlertOctagon className="w-8 h-8 text-[#B83C25]" />
            <h4 className="text-sm font-bold text-[#1E2022]">{language === 'zh' ? '数据加载失败' : 'Failed to Load Data'}</h4>
            <p className="text-xs text-[#6B6D70] font-mono bg-[#FCF1EE] p-3 border border-[#EAE9E4] rounded max-w-lg leading-relaxed">
              {error}
            </p>
            <button
              onClick={fetchAlerts}
              className="mt-2 px-4 py-1.5 text-xs font-semibold bg-[#C2593F] text-white rounded hover:bg-[#A94A32] transition-colors duration-150"
            >
              {language === 'zh' ? '重新连接' : 'Reconnect'}
            </button>
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <Shield className="w-10 h-10 text-stone-400" />
            <h4 className="text-sm font-bold text-[#1E2022]">{language === 'zh' ? '无安全告警记录' : 'No Security Alerts'}</h4>
            <p className="text-xs text-[#6B6D70]">{t('alerts', 'noAlerts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F5EF] border-b border-[#EAE9E4] text-[#6B6D70] text-xs font-bold uppercase tracking-wider font-sans">
                  <th className="py-3.5 px-5 w-28">{t('alerts', 'colId')}</th>
                  <th className="py-3.5 px-4 w-32">{t('alerts', 'colSource')}</th>
                  <th className="py-3.5 px-4">{t('alerts', 'colDescription')}</th>
                  <th className="py-3.5 px-4 w-32">{t('alerts', 'colSeverity')}</th>
                  <th className="py-3.5 px-4 w-40">{t('alerts', 'colCategory')}</th>
                  <th className="py-3.5 px-4 w-48">{t('alerts', 'colTime')}</th>
                  <th className="py-3.5 px-5 text-right w-24">{t('alerts', 'colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE9E4] text-sm">
                {sortedAlerts.map((alert) => {
                  const sKey = alert.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
                  const sLabel = t('alerts', `severity.${sKey}`, alert.severity.toUpperCase());
                  const severityConfig = {
                    critical: { bg: 'bg-[#FCF1EE]', text: 'text-[#B83C25]' },
                    high: { bg: 'bg-[#FCF1EE]', text: 'text-[#B83C25]' },
                    medium: { bg: 'bg-[#FAF5E6]', text: 'text-[#A37110]' },
                    low: { bg: 'bg-[#F0F6F1]', text: 'text-[#25633A]' }
                  }[sKey] || { bg: 'bg-[#F5F3EB]', text: 'text-stone-600' };

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#F5F3EB]/50 transition-colors duration-100 group"
                    >
                      {/* ID */}
                      <td className="py-4 px-5 font-mono font-semibold text-stone-500 group-hover:text-[#C2593F] text-sm">
                        {alert.id}
                      </td>

                      {/* Source */}
                      <td className="py-4 px-4 font-mono text-stone-500 text-sm">
                        {alert.source}
                      </td>

                      {/* Title */}
                      <td className="py-4 px-4 font-semibold text-[#1E2022] leading-snug text-sm">
                        {language === 'zh' ? translateFrom(translations.mockAlerts, alert.title, language, alert.title) : alert.title}
                      </td>

                      {/* Severity */}
                      <td className="py-4 px-4">
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded font-mono ${severityConfig.bg} ${severityConfig.text}`}>
                          {sLabel}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="inline-block whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded bg-[#F5F3EB] border border-[#EAE9E4] text-stone-600 font-mono uppercase">
                          {language === 'zh' ? (categoryNames[alert.category]?.zh || alert.category) : (categoryNames[alert.category]?.en || alert.category)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-mono text-stone-500 whitespace-nowrap text-sm">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-stone-400" />
                          {new Date(alert.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right whitespace-nowrap text-sm">
                        <Link
                          href={`/alerts/${alert.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#C2593F] hover:text-[#A94A32] underline decoration-transparent hover:decoration-[#A94A32] transition-all duration-150"
                        >
                          <span>{t('alerts', 'btnInvestigate')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
