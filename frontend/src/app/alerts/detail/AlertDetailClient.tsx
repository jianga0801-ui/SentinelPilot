'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Database,
  ShieldAlert,
  Cpu,
  Terminal,
  User,
  Globe,
  Laptop,
  Code,
  Copy,
  CheckCircle,
  Play,
  Loader2,
  Lock
} from 'lucide-react';
import { api, Alert } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { translations, translateFrom } from '@/lib/translations';

export default function AlertDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertId = searchParams.get('id') || '';
  const { language, t } = useLanguage();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw JSON accordion state
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Investigation trigger states
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;
    const fetchAlert = async () => {
      try {
        setLoading(true);
        const data = await api.getAlert(alertId);
        setAlert(data);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : (language === 'zh' ? '无法获取该告警的详细数据。' : 'Failed to retrieve detailed data for this alert.'));
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [alertId, language]);

  const handleCopyRaw = () => {
    if (!alert) return;
    navigator.clipboard.writeText(JSON.stringify(alert.raw, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchInvestigation = async () => {
    if (!alert) return;
    try {
      setTriggering(true);
      setTriggerError(null);

      // Step 1: Create the investigation
      const createRes = await api.createInvestigation(alert.id);
      const investigationId = createRes.id;

      // Step 2: Run the investigation background task
      await api.runInvestigation(investigationId);

      // Step 3: Redirect to the investigation dashboard page
      router.push(`/investigations/detail?id=${encodeURIComponent(investigationId)}`);
    } catch (err: unknown) {
      setTriggerError(err instanceof Error ? err.message : (language === 'zh' ? '发起 AI 调查任务失败，请检查后端 API 服务。' : 'Failed to trigger AI investigation. Please verify backend API.'));
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-[#C2593F] animate-spin" />
        <span className="text-sm text-stone-500 font-mono tracking-wider">
          {language === 'zh' ? '正在加载关联台账数据...' : 'Loading ledger detail...'}
        </span>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex-1 p-8 space-y-4 max-w-7xl mx-auto w-full">
        <Link href="/alerts" className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-[#1E2022]">
          <ArrowLeft className="w-4 h-4" /> {language === 'zh' ? '返回安全告警台账' : 'Return to Alerts Ledger'}
        </Link>
        <div className="bg-white border border-[#EAE9E4] p-10 rounded text-center flex flex-col items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-[#B83C25]" />
          <h4 className="text-sm font-bold text-[#1E2022]">{language === 'zh' ? '未找到指定告警' : 'Alert Not Found'}</h4>
          <p className="text-xs text-stone-500 max-w-sm">{error || (language === 'zh' ? '该告警不存在或已被系统归档。' : 'Alert does not exist or has been archived.')}</p>
        </div>
      </div>
    );
  }

  const sKey = alert.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
  const sLabel = t('alerts', `severity.${sKey}`, alert.severity.toUpperCase());
  const severityConfig = {
    critical: { bg: 'bg-[#FCF1EE]', text: 'text-[#B83C25]', border: 'border-[#FCF1EE]' },
    high: { bg: 'bg-[#FCF1EE]', text: 'text-[#B83C25]', border: 'border-[#FCF1EE]' },
    medium: { bg: 'bg-[#FAF5E6]', text: 'text-[#A37110]', border: 'border-[#FAF5E6]' },
    low: { bg: 'bg-[#F0F6F1]', text: 'text-[#25633A]', border: 'border-[#F0F6F1]' }
  }[sKey] || { bg: 'bg-[#F5F3EB]', text: 'text-stone-600', border: 'border-[#EAE9E4]' };

  return (
    <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumbs Navigation */}
      <div className="border-b border-[#EAE9E4] pb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#6B6D70] uppercase">
          <Link href="/alerts" className="hover:text-[#1E2022] transition-colors">{t('alertDetail', 'breadcrumbList')}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#C2593F]">{alert.id}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/alerts"
            className="w-8 h-8 border border-[#EAE9E4] rounded bg-white flex items-center justify-center text-stone-600 hover:text-[#1E2022] hover:bg-[#F5F3EB] transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-serif font-black text-[#1E2022] tracking-tight leading-tight flex items-center gap-2">
              {t('alertDetail', 'title')}
            </h2>
            <p className="text-xs text-[#6B6D70] mt-1">
              {t('alertDetail', 'subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Details (Left 2/3) + AI Action Dispatch Panel (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Properties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-white border border-[#EAE9E4] p-6 rounded space-y-5 relative overflow-hidden">
            {/* Visual Header */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="text-sm font-mono font-bold text-[#C2593F] uppercase">
                  {alert.id}
                </span>
                <h3 className="text-xl font-serif font-black text-[#1E2022] tracking-tight">
                  {language === 'zh' ? translateFrom(translations.mockAlerts, alert.title, language, alert.title) : alert.title}
                </h3>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded border uppercase font-mono ${severityConfig.bg} ${severityConfig.text} ${severityConfig.border}`}>
                {sLabel}
              </span>
            </div>

            {/* Description */}
            <div className="p-4 bg-[#FBF8F0] border border-[#EAE9E4] rounded">
              <span className="text-xs font-bold text-[#6B6D70] tracking-wider uppercase font-sans block mb-1.5">
                {language === 'zh' ? '告警事件行为摘要' : 'Alert Event Behavior Summary (Description)'}
              </span>
              <p className="text-sm text-stone-700 leading-relaxed font-sans">
                {language === 'zh' ? translateFrom(translations.mockAlerts, alert.description, language, alert.description) : alert.description}
              </p>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE9E4] rounded">
                <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-sans block uppercase">{language === 'zh' ? '设备源' : 'Source'}</span>
                <span className="text-sm font-semibold text-stone-800 font-mono mt-1 block">{alert.source}</span>
              </div>
              <div className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE9E4] rounded">
                <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-sans block uppercase">{language === 'zh' ? '设备类型' : 'Device Type'}</span>
                <span className="text-sm font-semibold text-stone-800 font-mono mt-1 block">{alert.device_type}</span>
              </div>
              <div className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE9E4] rounded">
                <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-sans block uppercase">{language === 'zh' ? '集成厂商' : 'Vendor'}</span>
                <span className="text-sm font-semibold text-stone-800 mt-1 block truncate">{alert.vendor || (language === 'zh' ? '通用协议' : 'Generic')}</span>
              </div>
              <div className="px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE9E4] rounded">
                <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-sans block uppercase">{language === 'zh' ? '产品名称' : 'Product'}</span>
                <span className="text-sm font-semibold text-stone-800 mt-1 block truncate">{alert.product || (language === 'zh' ? '未关联' : 'N/A')}</span>
              </div>
            </div>

            {/* Time range */}
            <div className="flex items-center gap-2 p-3 bg-[#F5F3EB] rounded text-sm text-stone-600 font-mono">
              <Clock className="w-4.5 h-4.5 text-stone-400" />
              <span className="font-sans font-medium text-stone-500">{t('alertDetail', 'fieldTime')}:</span>
              <span className="text-[#1E2022] font-semibold">
                {new Date(alert.time_range.start).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}
              </span>
              <span className="text-stone-400 font-sans px-1">{language === 'zh' ? '至' : 'to'}</span>
              <span className="text-[#1E2022] font-semibold">
                {new Date(alert.time_range.end).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}
              </span>
            </div>
          </div>

          {/* Associated Entities Grid */}
          <div className="bg-white border border-[#EAE9E4] p-6 rounded space-y-4">
            <h4 className="text-base font-serif font-black text-[#1E2022] tracking-tight flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-[#C2593F]" />
              <span>{t('alertDetail', 'normalizedFields')}</span>
            </h4>

            {Object.keys(alert.entities).length === 0 ? (
              <p className="text-sm text-stone-500 italic p-4 text-center">{t('alertDetail', 'emptyEntities')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {alert.entities.src_ip && (
                  <div className="p-4 bg-white border border-[#EAE9E4] rounded flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#F5F3EB] flex items-center justify-center text-stone-700">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-mono block uppercase">{t('alertDetail', 'fieldIp')}</span>
                      <span className="text-sm font-bold text-[#1E2022] font-mono block mt-0.5">{alert.entities.src_ip}</span>
                    </div>
                  </div>
                )}
                {alert.entities.dst_host && (
                  <div className="p-4 bg-white border border-[#EAE9E4] rounded flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#F5F3EB] flex items-center justify-center text-stone-700">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-mono block uppercase">{t('alertDetail', 'fieldHost')}</span>
                      <span className="text-sm font-bold text-[#1E2022] font-mono block mt-0.5">{alert.entities.dst_host}</span>
                    </div>
                  </div>
                )}
                {alert.entities.username && (
                  <div className="p-4 bg-white border border-[#EAE9E4] rounded flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#F5F3EB] flex items-center justify-center text-stone-700">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-mono block uppercase">{t('alertDetail', 'fieldUser')}</span>
                      <span className="text-sm font-bold text-[#1E2022] font-mono block mt-0.5">{alert.entities.username}</span>
                    </div>
                  </div>
                )}
                {Object.entries(alert.entities).map(([key, val]) => {
                  if (['src_ip', 'dst_host', 'username'].includes(key)) return null;
                  return (
                    <div key={key} className="p-4 bg-white border border-[#EAE9E4] rounded flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-[#F5F3EB] flex items-center justify-center text-stone-600">
                        <Code className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#6B6D70] tracking-wider font-mono block uppercase">{key}</span>
                        <span className="text-sm font-bold text-[#1E2022] font-mono block mt-0.5">{String(val)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Raw JSON Accordion */}
          <div className="bg-white border border-[#EAE9E4] rounded overflow-hidden">
            <button
              onClick={() => setIsRawExpanded(!isRawExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between text-sm font-bold text-stone-700 hover:bg-[#F5F3EB]/40 transition-colors duration-150"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-stone-500" />
                <span>{t('alertDetail', 'rawLog')}</span>
              </span>
              <span className="text-xs font-mono text-[#C2593F]">
                {isRawExpanded ? (language === 'zh' ? '收起 COLLAPSE' : 'COLLAPSE') : (language === 'zh' ? '展开 EXPAND' : 'EXPAND')}
              </span>
            </button>

            {isRawExpanded && (
              <div className="border-t border-[#EAE9E4] bg-[#FBF8F0] p-4 relative group font-mono">
                <button
                  onClick={handleCopyRaw}
                  className="absolute right-4 top-4 p-1.5 rounded bg-white border border-[#EAE9E4] text-stone-500 hover:text-[#1E2022] hover:border-stone-400 transition-colors duration-150"
                  title={language === 'zh' ? '复制数据' : 'Copy'}
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <pre className="text-sm leading-relaxed text-stone-800 overflow-x-auto max-h-96 pr-10 font-mono">
                  {JSON.stringify(alert.raw, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Action Dispatch Panel */}
        <div className="space-y-6">
          <div className="bg-[#F7F5EF] border border-[#EAE9E4] p-6 rounded space-y-5 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#C2593F]" />
              <h4 className="text-xs font-bold text-[#6B6D70] uppercase tracking-widest font-sans">
                {t('alertDetail', 'copilotTitle')}
              </h4>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-serif font-black text-[#1E2022]">
                {language === 'zh' ? '拉起威胁研判工作流' : 'Initiate Threat Investigation'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed leading-5">
                {t('alertDetail', 'copilotDesc')}
              </p>
            </div>

            {/* Launch CTA */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleLaunchInvestigation}
                disabled={triggering}
                className="w-full py-3 rounded font-bold text-sm tracking-wide bg-[#C2593F] text-white hover:bg-[#A94A32] flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {triggering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{t('alertDetail', 'btnLaunching')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-white" />
                    <span>{t('alertDetail', 'btnLaunch')}</span>
                  </>
                )}
              </button>

              {triggerError && (
                <div className="p-3 border border-[#FCF1EE] bg-[#FCF1EE] text-[#B83C25] text-xs font-semibold rounded leading-relaxed">
                  {triggerError}
                </div>
              )}
            </div>

            {/* Simulated execution prompt guard */}
            <div className="pt-4 border-t border-[#EAE9E4] text-xs text-stone-500 flex flex-col gap-1 font-mono">
              <span className="font-sans font-bold text-stone-600 uppercase tracking-wider block flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>{language === 'zh' ? '安全围栏技术生效' : 'Safety Sandbox Active'}</span>
              </span>
              <p className="leading-snug text-stone-500 mt-0.5">
                {language === 'zh'
                  ? '当前为离线高仿真模拟，阻断 IP 或隔离终端动作仅进行策略审计或虚拟授权，不会对生产网络下发真实阻断。'
                  : 'This environment runs in sandbox simulation mode. Any blocking or isolation actions will perform policy audits or virtual approvals, with no impact on production networks.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
