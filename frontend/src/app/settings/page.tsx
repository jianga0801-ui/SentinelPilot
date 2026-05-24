'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Globe2,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { api, type SettingsResponse, type SystemConfigItem } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const groups = [
  {
    id: 'general',
    icon: Globe2,
    keys: ['default_language', 'log_retention_days'],
  },
  {
    id: 'llm',
    icon: Bot,
    keys: ['llm_enabled', 'llm_provider', 'llm_base_url', 'llm_api_key', 'llm_model', 'llm_prompt_profile', 'llm_action_mode', 'llm_allow_high_risk_actions'],
  },
  {
    id: 'policies',
    icon: ShieldCheck,
    keys: ['auto_investigate_high_risk'],
  },
  {
    id: 'data_sources',
    icon: Database,
    keys: [],
  },
] as const;

const labels: Record<string, { zh: string; en: string }> = {
  general: { zh: '通用设置', en: 'General' },
  llm: { zh: '模型配置', en: 'LLM' },
  integrations: { zh: '通知集成', en: 'Integrations' },
  policies: { zh: '研判策略', en: 'Policies' },
  data_sources: { zh: '告警源', en: 'Data Sources' },
  default_language: { zh: '默认语言', en: 'Default Language' },
  log_retention_days: { zh: '日志保留天数', en: 'Log Retention Days' },
  llm_enabled: { zh: '启用模型研判', en: 'Enable LLM' },
  llm_provider: { zh: '模型提供商', en: 'Provider' },
  llm_base_url: { zh: '接口地址', en: 'Base URL' },
  llm_api_key: { zh: '接口密钥', en: 'API Key' },
  llm_model: { zh: '模型名称', en: 'Model' },
  llm_prompt_profile: { zh: '提示词策略', en: 'Prompt Profile' },
  llm_action_mode: { zh: '动作模式', en: 'Action Mode' },
  llm_allow_high_risk_actions: { zh: '允许高风险建议', en: 'Allow High-risk Proposals' },
  im_notification_enabled: { zh: '启用通知', en: 'Enable Notification' },
  im_provider: { zh: '通知渠道', en: 'Provider' },
  dingtalk_webhook_url: { zh: '钉钉机器人地址', en: 'DingTalk Webhook' },
  dingtalk_secret: { zh: '钉钉签名密钥', en: 'DingTalk Secret' },
  dingtalk_card_callback_url: { zh: '卡片回调地址', en: 'Card Callback URL' },
  feishu_webhook_url: { zh: '飞书机器人地址', en: 'Feishu Webhook' },
  feishu_secret: { zh: '飞书签名密钥', en: 'Feishu Secret' },
  wecom_webhook_url: { zh: '企业微信机器人地址', en: 'WeCom Webhook' },
  public_app_url: { zh: '前端公开地址', en: 'Public App URL' },
  auto_investigate_high_risk: { zh: '高危告警自动研判', en: 'Auto-investigate High Risk' },
};

const descriptions: Record<string, { zh: string; en: string }> = {
  default_language: { zh: '控制默认界面语言', en: 'Default UI language' },
  log_retention_days: { zh: '服务日志保留周期', en: 'Service log retention period' },
  llm_enabled: { zh: '是否启用模型辅助研判', en: 'Whether model-assisted investigation is enabled' },
  llm_provider: { zh: '模型服务厂商或兼容协议', en: 'Model provider or compatible protocol' },
  llm_base_url: { zh: '模型服务接口地址', en: 'Model service base URL' },
  llm_api_key: { zh: '模型服务访问密钥', en: 'Model service API key' },
  llm_model: { zh: '默认调用的模型名称', en: 'Default model name' },
  llm_prompt_profile: { zh: '研判提示词策略档位', en: 'Investigation prompt profile' },
  llm_action_mode: { zh: '响应动作建议与审批边界', en: 'Response proposal and approval boundary' },
  llm_allow_high_risk_actions: { zh: '是否允许模型提出高风险动作', en: 'Whether high-risk proposals are allowed' },
  im_notification_enabled: { zh: '是否启用即时通知', en: 'Whether IM notification is enabled' },
  im_provider: { zh: '即时通讯通知渠道', en: 'Instant messaging provider' },
  dingtalk_webhook_url: { zh: '钉钉机器人推送入口', en: 'DingTalk robot webhook URL' },
  dingtalk_secret: { zh: '钉钉机器人签名密钥', en: 'DingTalk robot signing secret' },
  dingtalk_card_callback_url: { zh: '交互卡片审批回调地址', en: 'Interactive card callback URL' },
  feishu_webhook_url: { zh: '飞书自定义机器人推送入口', en: 'Feishu custom bot webhook URL' },
  feishu_secret: { zh: '飞书自定义机器人签名密钥', en: 'Feishu custom bot signing secret' },
  wecom_webhook_url: { zh: '企业微信群机器人推送入口', en: 'WeCom group robot webhook URL' },
  public_app_url: { zh: '审批卡片跳回系统的公开地址', en: 'Public URL used by approval cards' },
  auto_investigate_high_risk: { zh: '高危告警进入队列后是否自动研判', en: 'Whether high-risk alerts auto-start investigation' },
};

const settingOptions: Record<string, Array<{ value: string; zh: string; en: string }>> = {
  default_language: [
    { value: 'zh', zh: '中文', en: 'Chinese' },
    { value: 'en', zh: '英文', en: 'English' },
  ],
  llm_enabled: [
    { value: 'true', zh: '启用', en: 'Enabled' },
    { value: 'false', zh: '关闭', en: 'Disabled' },
  ],
  llm_provider: [
    { value: 'mock', zh: '本地模拟模型', en: 'Local Mock' },
    { value: 'openai_compatible', zh: 'OpenAI 兼容接口', en: 'OpenAI Compatible' },
  ],
  llm_prompt_profile: [
    { value: 'default', zh: '默认研判策略', en: 'Default' },
    { value: 'conservative', zh: '保守复核策略', en: 'Conservative' },
    { value: 'rapid_triage', zh: '快速分流策略', en: 'Rapid Triage' },
  ],
  llm_action_mode: [
    { value: 'recommend_only', zh: '仅给建议', en: 'Recommend Only' },
    { value: 'approval_required', zh: '高风险需审批', en: 'Approval Required' },
    { value: 'auto_approve_simulated', zh: '仅模拟自动批准', en: 'Simulated Auto Approval' },
  ],
  llm_allow_high_risk_actions: [
    { value: 'true', zh: '允许提出', en: 'Allowed' },
    { value: 'false', zh: '禁止提出', en: 'Blocked' },
  ],
  im_notification_enabled: [
    { value: 'true', zh: '启用', en: 'Enabled' },
    { value: 'false', zh: '关闭', en: 'Disabled' },
  ],
  im_provider: [
    { value: 'dingtalk', zh: '钉钉机器人', en: 'DingTalk Robot' },
    { value: 'feishu', zh: '飞书机器人', en: 'Feishu Robot' },
    { value: 'wecom', zh: '企业微信机器人', en: 'WeCom Robot' },
  ],
  auto_investigate_high_risk: [
    { value: 'true', zh: '自动研判', en: 'Auto Investigate' },
    { value: 'false', zh: '人工触发', en: 'Manual' },
  ],
};

const examples: Record<string, string> = {
  log_retention_days: '14',
  llm_base_url: 'https://api.example.com/v1',
  llm_api_key: 'sk-...',
  llm_model: 'gpt-4.1-mini / qwen-plus',
  dingtalk_webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=...',
  dingtalk_secret: 'SEC...',
  dingtalk_card_callback_url: 'https://sentinel.example.com/api/integrations/im/dingtalk/card-callback',
  feishu_webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
  feishu_secret: '飞书机器人签名密钥',
  wecom_webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
  public_app_url: 'http://localhost:3000',
};

export default function SettingsPage() {
  const { language } = useLanguage();
  const [activeGroup, setActiveGroup] = useState<(typeof groups)[number]['id']>('general');
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSettings();
      setSettings(result);
      setDraft(
        Object.fromEntries(
          Object.entries(result.items).map(([key, item]) => [key, item.value ?? '']),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSettings();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadSettings]);

  useEffect(() => {
    try {
      const section = new URLSearchParams(window.location.search).get('section');
      if (section && groups.some((group) => group.id === section)) {
        const handle = window.requestAnimationFrame(() => {
          setActiveGroup(section as (typeof groups)[number]['id']);
        });
        return () => window.cancelAnimationFrame(handle);
      }
    } catch {
      // Query access can be blocked in restricted browser contexts.
    }
    return undefined;
  }, []);

  const active = groups.find((group) => group.id === activeGroup) || groups[0];
  const activeKeys = useMemo(() => {
    return [...active.keys];
  }, [active.keys]);
  const visibleItems = useMemo(() => {
    if (!settings) return [];
    return activeKeys
      .map((key) => settings.items[key])
      .filter((item): item is SystemConfigItem => Boolean(item));
  }, [activeKeys, settings]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      const patch = Object.fromEntries(
        visibleItems.map((item) => [item.key, draft[item.key] ?? '']),
      );
      const result = await api.updateSettings(patch);
      setSettings(result);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '配置安全边界' : 'Configuration Guardrails'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '系统设置中心' : 'Settings Center'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '集中管理非敏感运行策略。密钥类配置只显示是否已配置，不在前端回显明文。'
              : 'Manage operational policy in one place. Secret values only expose configured state and are never returned as plaintext.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || !settings || activeKeys.length === 0}
            className="sp-primary-button inline-flex h-10 items-center gap-2 rounded px-4 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? (language === 'zh' ? '保存中' : 'Saving') : (language === 'zh' ? '保存当前页' : 'Save Section')}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm" style={{ background: 'var(--sp-danger-soft)', borderColor: 'var(--sp-danger)', color: 'var(--sp-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-6 flex items-center gap-3 rounded border px-4 py-3 text-sm sp-status-online">
          <CheckCircle2 className="h-4 w-4" />
          {language === 'zh' ? '设置已保存。动态接入模块会在后续调用中读取新配置。' : 'Settings saved. Dynamic modules will read the updated configuration on subsequent calls.'}
        </div>
      )}

      <main className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="sp-panel p-2">
          {groups.map((group) => {
            const Icon = group.icon;
            const active = group.id === activeGroup;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`mb-1 grid h-10 w-full grid-cols-[16px_minmax(0,1fr)] items-center gap-3 rounded px-3 text-left text-sm font-semibold transition-colors ${
                  active ? 'sp-nav-item-active' : 'sp-nav-item'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label(group.id, language)}</span>
              </button>
            );
          })}
        </nav>

        <section className="sp-panel">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--sp-border)' }}>
            <h3 className="text-sm font-semibold sp-text">{label(active.id, language)}</h3>
            <p className="mt-1 text-xs sp-muted">
              {active.id === 'data_sources'
                ? (language === 'zh' ? '真实 SIEM/EDR 凭据后续按适配器接入，这里先保留配置入口。' : 'Real SIEM/EDR credentials will be wired through adapter-specific integration later.')
                : (language === 'zh' ? '修改后会写入系统配置表，敏感字段不会被接口回显。' : 'Changes are stored in system_config. Sensitive fields are not returned by the API.')}
            </p>
          </div>

          {loading && !settings ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse sp-panel-muted" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="p-8 text-sm leading-6 sp-muted">
              {language === 'zh'
                ? '此分组暂不开放写入。保留入口是为了后续接入真实告警源适配器时不再重构导航结构。'
                : 'This section is intentionally read-only for now. It reserves the IA for future real source adapters.'}
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {visibleItems.map((item) => (
                <SettingRow
                  key={item.key}
                  item={item}
                  value={draft[item.key] ?? ''}
                  language={language}
                  options={settingOptions[item.key]}
                  example={examples[item.key]}
                  onChange={(value) => setDraft((current) => ({ ...current, [item.key]: value }))}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SettingRow({
  item,
  value,
  language,
  options,
  example,
  onChange,
}: {
  item: SystemConfigItem;
  value: string;
  language: 'zh' | 'en';
  options?: Array<{ value: string; zh: string; en: string }>;
  example?: string;
  onChange: (value: string) => void;
}) {
  const booleanLike = value === 'true' || value === 'false' || ['llm_enabled', 'im_notification_enabled', 'llm_allow_high_risk_actions', 'auto_investigate_high_risk'].includes(item.key);
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[240px_minmax(0,1fr)_130px] md:items-center">
      <div>
        <div className="text-sm font-semibold sp-text">{label(item.key, language)}</div>
        <div className="mt-1 text-[11px] sp-muted">{description(item.key, language)}</div>
      </div>

      {options ? (
        <select
          value={value || options[0]?.value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {language === 'zh' ? option.zh : option.en}
            </option>
          ))}
        </select>
      ) : booleanLike ? (
        <select
          value={value || 'false'}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        >
          <option value="true">{language === 'zh' ? '启用' : 'Enabled'}</option>
          <option value="false">{language === 'zh' ? '关闭' : 'Disabled'}</option>
        </select>
      ) : item.sensitive ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={item.configured ? (language === 'zh' ? '已配置，输入新值覆盖' : 'Configured, type to replace') : (example || (language === 'zh' ? '未配置' : 'Not configured'))}
          type="password"
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={example ? `${language === 'zh' ? '示例' : 'Example'}: ${example}` : undefined}
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        />
      )}

      <span className={`inline-flex h-6 w-fit items-center rounded border px-2 font-mono text-[10px] uppercase ${item.configured ? 'sp-status-online' : 'sp-status-disabled'}`}>
        {item.sensitive
          ? (item.configured ? (language === 'zh' ? '已配置' : 'Configured') : (language === 'zh' ? '未配置' : 'Missing'))
          : options ? (language === 'zh' ? '可选择' : 'Selectable') : (language === 'zh' ? '可编辑' : 'Editable')}
      </span>
    </div>
  );
}

function label(key: string, language: 'zh' | 'en') {
  const entry = labels[key];
  if (!entry) return key;
  return language === 'zh' ? entry.zh : entry.en;
}

function description(key: string, language: 'zh' | 'en') {
  const entry = descriptions[key];
  if (!entry) return key;
  return language === 'zh' ? entry.zh : entry.en;
}
