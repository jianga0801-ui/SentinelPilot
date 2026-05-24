'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, RefreshCw, Save } from 'lucide-react';
import { api, type SettingsResponse, type SystemConfigItem } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const providerKeys: Record<string, string[]> = {
  dingtalk: ['im_notification_enabled', 'im_provider', 'dingtalk_webhook_url', 'dingtalk_secret', 'dingtalk_card_callback_url', 'public_app_url'],
  feishu: ['im_notification_enabled', 'im_provider', 'feishu_webhook_url', 'feishu_secret', 'public_app_url'],
  wecom: ['im_notification_enabled', 'im_provider', 'wecom_webhook_url', 'public_app_url'],
};

const labels: Record<string, { zh: string; en: string }> = {
  im_notification_enabled: { zh: '启用通知', en: 'Enable Notification' },
  im_provider: { zh: '通知渠道', en: 'Provider' },
  dingtalk_webhook_url: { zh: '钉钉机器人地址', en: 'DingTalk Webhook' },
  dingtalk_secret: { zh: '钉钉签名密钥', en: 'DingTalk Secret' },
  dingtalk_card_callback_url: { zh: '卡片回调地址', en: 'Card Callback URL' },
  feishu_webhook_url: { zh: '飞书机器人地址', en: 'Feishu Webhook' },
  feishu_secret: { zh: '飞书签名密钥', en: 'Feishu Secret' },
  wecom_webhook_url: { zh: '企业微信机器人地址', en: 'WeCom Webhook' },
  public_app_url: { zh: '前端公开地址', en: 'Public App URL' },
};

const descriptions: Record<string, { zh: string; en: string }> = {
  im_notification_enabled: { zh: '控制即时通讯机器人推送是否启用', en: 'Controls whether IM robot notifications are enabled' },
  im_provider: { zh: '当前使用的通知机器人渠道', en: 'Robot provider used for notifications' },
  dingtalk_webhook_url: { zh: '钉钉机器人推送入口', en: 'DingTalk robot webhook URL' },
  dingtalk_secret: { zh: '钉钉机器人签名密钥', en: 'DingTalk robot signing secret' },
  dingtalk_card_callback_url: { zh: '交互卡片审批回调地址', en: 'Interactive approval card callback URL' },
  feishu_webhook_url: { zh: '飞书自定义机器人推送入口', en: 'Feishu custom bot webhook URL' },
  feishu_secret: { zh: '飞书自定义机器人签名密钥', en: 'Feishu custom bot signing secret' },
  wecom_webhook_url: { zh: '企业微信群机器人推送入口', en: 'WeCom group robot webhook URL' },
  public_app_url: { zh: '审批卡片跳回系统的公开地址', en: 'Public URL used by approval cards' },
};

const examples: Record<string, string> = {
  dingtalk_webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=...',
  dingtalk_secret: 'SEC...',
  dingtalk_card_callback_url: 'https://sentinel.example.com/api/integrations/im/dingtalk/card-callback',
  feishu_webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
  feishu_secret: '飞书机器人签名密钥',
  wecom_webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
  public_app_url: 'http://localhost:3000',
};

const options: Record<string, Array<{ value: string; zh: string; en: string }>> = {
  im_notification_enabled: [
    { value: 'true', zh: '启用', en: 'Enabled' },
    { value: 'false', zh: '关闭', en: 'Disabled' },
  ],
  im_provider: [
    { value: 'dingtalk', zh: '钉钉机器人', en: 'DingTalk Robot' },
    { value: 'feishu', zh: '飞书机器人', en: 'Feishu Robot' },
    { value: 'wecom', zh: '企业微信机器人', en: 'WeCom Robot' },
  ],
};

export default function IntegrationsPage() {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSettings();
      setSettings(result);
      setDraft(Object.fromEntries(Object.entries(result.items).map(([key, item]) => [key, item.value ?? ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
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

  const visibleKeys = useMemo(() => {
    const provider = draft.im_provider || 'dingtalk';
    return providerKeys[provider] || providerKeys.dingtalk;
  }, [draft.im_provider]);

  const visibleItems = useMemo(() => {
    if (!settings) return [];
    return visibleKeys
      .map((key) => settings.items[key])
      .filter((item): item is SystemConfigItem => Boolean(item));
  }, [settings, visibleKeys]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      const patch = Object.fromEntries(visibleItems.map((item) => [item.key, draft[item.key] ?? '']));
      const result = await api.updateSettings(patch);
      setSettings(result);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integrations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sp-page flex-1 overflow-y-auto p-8 font-sans">
      <header className="mb-7 flex flex-col gap-4 border-b pb-6 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: 'var(--sp-border)' }}>
        <div>
          <div className="sp-muted flex items-center gap-2 text-xs font-semibold">
            <Bell className="h-4 w-4 sp-accent" />
            <span>{language === 'zh' ? '即时通讯渠道' : 'Notification Channels'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sp-text">
            {language === 'zh' ? '通知集成' : 'Integrations'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 sp-muted">
            {language === 'zh'
              ? '独立配置钉钉、飞书和企业微信机器人。敏感字段只显示配置状态，不回显明文。'
              : 'Configure DingTalk, Feishu, and WeCom robots independently. Secret fields expose configured state only.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSettings} disabled={loading} className="sp-panel sp-hoverable inline-flex h-10 items-center gap-2 px-4 text-xs font-semibold transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 sp-accent ${loading ? 'animate-spin' : ''}`} />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </button>
          <button onClick={saveSettings} disabled={saving || !settings} className="sp-primary-button inline-flex h-10 items-center gap-2 rounded px-4 text-xs font-semibold transition-colors disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />
            {saving ? (language === 'zh' ? '保存中' : 'Saving') : (language === 'zh' ? '保存配置' : 'Save')}
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
          {language === 'zh' ? '通知集成配置已保存。' : 'Integration settings saved.'}
        </div>
      )}

      <section className="sp-panel">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--sp-border)' }}>
          <h3 className="text-sm font-semibold sp-text">
            {language === 'zh' ? '机器人配置' : 'Robot Configuration'}
          </h3>
          <p className="mt-1 text-xs sp-muted">
            {language === 'zh' ? '切换渠道后只显示该渠道需要的地址、密钥和回调字段。' : 'Switching providers shows only the fields required by that robot.'}
          </p>
        </div>

        {loading && !settings ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse sp-panel-muted" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDE8]">
            {visibleItems.map((item) => (
              <IntegrationRow
                key={item.key}
                item={item}
                value={draft[item.key] ?? ''}
                language={language}
                onChange={(value) => setDraft((current) => ({ ...current, [item.key]: value }))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function IntegrationRow({
  item,
  value,
  language,
  onChange,
}: {
  item: SystemConfigItem;
  value: string;
  language: 'zh' | 'en';
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[240px_minmax(0,1fr)_130px] md:items-center">
      <div>
        <div className="text-sm font-semibold sp-text">{label(item.key, language)}</div>
        <div className="mt-1 text-[11px] sp-muted">{description(item.key, language)}</div>
      </div>

      {options[item.key] ? (
        <select
          aria-label={label(item.key, language)}
          value={value || options[item.key][0]?.value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        >
          {options[item.key].map((option) => (
            <option key={option.value} value={option.value}>
              {language === 'zh' ? option.zh : option.en}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={label(item.key, language)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={item.sensitive && item.configured ? (language === 'zh' ? '已配置，输入新值覆盖' : 'Configured, type to replace') : example(item.key, language)}
          type={item.sensitive ? 'password' : 'text'}
          className="h-10 rounded border px-3 text-sm outline-none"
          style={{ background: 'var(--sp-bg)', borderColor: 'var(--sp-border)', color: 'var(--sp-text)' }}
        />
      )}

      <span className={`inline-flex h-6 w-fit items-center rounded border px-2 font-mono text-[10px] uppercase ${item.configured ? 'sp-status-online' : 'sp-status-disabled'}`}>
        {item.sensitive
          ? (item.configured ? (language === 'zh' ? '已配置' : 'Configured') : (language === 'zh' ? '未配置' : 'Missing'))
          : options[item.key] ? (language === 'zh' ? '可选择' : 'Selectable') : (language === 'zh' ? '可编辑' : 'Editable')}
      </span>
    </div>
  );
}

function label(key: string, language: 'zh' | 'en') {
  const entry = labels[key];
  return entry ? entry[language] : key;
}

function description(key: string, language: 'zh' | 'en') {
  const entry = descriptions[key];
  return entry ? entry[language] : key;
}

function example(key: string, language: 'zh' | 'en') {
  const value = examples[key];
  if (!value) return undefined;
  return `${language === 'zh' ? '示例' : 'Example'}: ${value}`;
}
