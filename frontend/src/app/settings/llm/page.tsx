'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { api, type LLMStatus } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const actionModeLabels = {
  recommend_only: {
    zh: '只生成建议',
    en: 'Recommend only',
  },
  approval_required: {
    zh: '生成审批动作',
    en: 'Approval required',
  },
  auto_approve_simulated: {
    zh: '自动通过模拟动作',
    en: 'Auto-approve simulated',
  },
};

const envRows = [
  'LLM_ENABLED',
  'LLM_PROVIDER',
  'LLM_BASE_URL',
  'LLM_API_KEY',
  'LLM_MODEL',
  'LLM_ACTION_MODE',
  'LLM_ALLOW_HIGH_RISK_ACTIONS',
];

export default function LLMSettingsPage() {
  const { language } = useLanguage();
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus(await api.getLLMStatus());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load LLM status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadStatus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatus]);

  const modeLabel = useMemo(() => {
    if (!status) return '';
    const label = actionModeLabels[status.action_mode];
    return language === 'zh' ? label.zh : label.en;
  }, [language, status]);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-[#FCFAF6] font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#EAE9E4] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#6B6D70] uppercase">
            <Bot className="w-4 h-4 text-[#C2593F]" />
            <span>{language === 'zh' ? '模型接入与约束策略' : 'Model Access & Guardrails'}</span>
          </div>
          <h2 className="text-xl font-semibold text-[#1E2022] tracking-tight mt-1 font-serif">
            {language === 'zh' ? '大模型配置中心' : 'LLM Configuration Center'}
          </h2>
          <p className="text-sm text-[#6B6D70] mt-2 font-sans max-w-3xl">
            {language === 'zh'
              ? '当前版本从后端环境变量读取模型配置，前端只展示脱敏状态和约束策略。API Key 不会回显。'
              : 'This version reads model settings from backend environment variables. The UI only shows sanitized status and guardrails; API keys are never returned.'}
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded border border-[#EAE9E4] bg-white hover:bg-[#F5F3EB] hover:border-[#D1CDC2] text-[#1E2022] font-mono text-xs font-semibold transition-all disabled:opacity-50 select-none cursor-pointer active:scale-98"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#C2593F] ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'zh' ? '刷新状态' : 'Refresh Status'}</span>
        </button>
      </div>

      {error && (
        <div className="p-5 rounded border-l-4 border-l-[#B83C25] border-[#EAE9E4] bg-white flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B83C25] flex-shrink-0" />
          <p className="text-sm text-[#6B6D70]">{error}</p>
        </div>
      )}

      {status && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="p-6 rounded border border-[#EAE9E4] bg-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider">
                  {language === 'zh' ? '模型状态' : 'Model Status'}
                </span>
                <span className={`text-[10px] font-bold font-mono rounded px-2 py-1 ${
                  status.enabled ? 'bg-[#EAF5EF] text-emerald-700' : 'bg-[#EAE9E4] text-[#6B6D70]'
                }`}>
                  {status.enabled ? (language === 'zh' ? '已启用' : 'Enabled') : (language === 'zh' ? '未启用' : 'Disabled')}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <ConfigLine label={language === 'zh' ? 'Provider' : 'Provider'} value={status.provider} />
                <ConfigLine label={language === 'zh' ? '模型名称' : 'Model'} value={status.model || '-'} />
                <ConfigLine label={language === 'zh' ? 'Prompt Profile' : 'Prompt Profile'} value={status.prompt_profile} />
              </div>
            </section>

            <section className="p-6 rounded border border-[#EAE9E4] bg-white space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#C2593F]" />
                <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider">
                  {language === 'zh' ? '连接配置' : 'Connection'}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <ConfigLine
                  label={language === 'zh' ? 'Base URL' : 'Base URL'}
                  value={status.base_url_configured ? (language === 'zh' ? '已配置' : 'Configured') : (language === 'zh' ? '未配置' : 'Missing')}
                />
                <ConfigLine
                  label={language === 'zh' ? 'API Key' : 'API Key'}
                  value={status.api_key_configured ? '********' : '-'}
                />
                <ConfigLine label={language === 'zh' ? '超时' : 'Timeout'} value={`${status.timeout_seconds}s`} />
              </div>
            </section>

            <section className="p-6 rounded border border-[#EAE9E4] bg-white space-y-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C2593F]" />
                <span className="text-xs font-mono text-[#6B6D70] uppercase tracking-wider">
                  {language === 'zh' ? '动作权限' : 'Action Authority'}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <ConfigLine label={language === 'zh' ? '动作模式' : 'Action Mode'} value={modeLabel} />
                <ConfigLine
                  label={language === 'zh' ? '高风险建议' : 'High-risk Proposals'}
                  value={status.constraints.high_risk_actions_allowed ? (language === 'zh' ? '允许' : 'Allowed') : (language === 'zh' ? '禁止' : 'Blocked')}
                />
                <ConfigLine
                  label={language === 'zh' ? '真实动作执行' : 'Real Action Execution'}
                  value={status.constraints.real_response_actions_enabled ? (language === 'zh' ? '已启用' : 'Enabled') : (language === 'zh' ? '未接入' : 'Not integrated')}
                />
              </div>
            </section>
          </div>

          <section className="p-6 rounded border border-[#EAE9E4] bg-white space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
              <h3 className="text-sm font-semibold text-[#1E2022] tracking-wider uppercase font-mono">
                {language === 'zh' ? '模型约束策略' : 'Model Guardrails'}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Guardrail
                icon={<CheckCircle2 className="w-4 h-4" />}
                title={language === 'zh' ? '结构化输出' : 'Structured Output'}
                value={status.constraints.structured_output_required}
              />
              <Guardrail
                icon={<Lock className="w-4 h-4" />}
                title={language === 'zh' ? '密钥脱敏' : 'Secret Redaction'}
                value={status.constraints.secrets_hidden}
              />
              <Guardrail
                icon={<ShieldCheck className="w-4 h-4" />}
                title={language === 'zh' ? '高危审批' : 'High-risk Approval'}
                value={status.constraints.high_risk_requires_approval}
              />
              <Guardrail
                icon={<Terminal className="w-4 h-4" />}
                title={language === 'zh' ? '真实执行隔离' : 'Real Execution Isolated'}
                value={!status.constraints.real_response_actions_enabled}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {status.constraints.allowed_actions.map((action) => (
                <span key={action} className="text-xs font-mono px-2 py-1 rounded border border-[#EAE9E4] bg-[#FCFAF6] text-[#4A4B4D]">
                  {action}
                </span>
              ))}
            </div>
          </section>

          <section className="p-6 rounded border border-[#EAE9E4] bg-white space-y-4">
            <h3 className="text-sm font-semibold text-[#1E2022] tracking-wider uppercase font-mono">
              {language === 'zh' ? '后端环境变量' : 'Backend Environment Variables'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {envRows.map((name) => (
                <code key={name} className="px-3 py-2 rounded border border-[#EAE9E4] bg-[#FAF9F5] text-xs font-mono text-[#4A4B4D]">
                  {name}
                </code>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ConfigLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#6B6D70]">{label}</span>
      <span className="font-mono text-xs text-[#1E2022] text-right truncate max-w-[180px]" title={value}>
        {value}
      </span>
    </div>
  );
}

function Guardrail({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-[#EAE9E4] bg-[#FCFAF6] px-4 py-3">
      <div className={value ? 'text-[#2E7D32]' : 'text-[#B83C25]'}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-[#1E2022]">{title}</div>
        <div className={`text-[10px] font-mono uppercase ${value ? 'text-[#2E7D32]' : 'text-[#B83C25]'}`}>
          {value ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  );
}
