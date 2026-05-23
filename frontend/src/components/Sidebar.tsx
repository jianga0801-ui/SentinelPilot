'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Terminal,
  Cpu,
  Activity,
  Workflow,
  MessageSquare
} from 'lucide-react';
import { api, type IMStatus } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [imStatus, setIMStatus] = useState<IMStatus | null>(null);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.checkHealth();
        if (res?.status === 'ok') {
          setHealthStatus('online');
          const status = await api.getIMStatus();
          setIMStatus(status);
        } else {
          setHealthStatus('offline');
          setIMStatus(null);
        }
      } catch {
        setHealthStatus('offline');
        setIMStatus(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: t('sidebar', 'alertInbox'), href: '/alerts', icon: ShieldAlert },
    { name: t('sidebar', 'evalDashboard'), href: '/evals', icon: Workflow },
  ];

  return (
    <aside className="w-64 bg-[#F7F5EF] border-r border-[#EAE9E4] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#EAE9E4]">
        <Link href="/alerts" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#C2593F] text-[#FCFAF6] transition-transform duration-200 group-hover:scale-105">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-serif font-black text-lg text-[#1E2022] tracking-tight leading-tight">
              SentinelPilot
            </h1>
            <span className="text-[9px] text-[#6B6D70] font-sans font-bold uppercase tracking-widest block mt-0.5">
              {language === 'zh' ? 'AI 安全辅助研判平台' : 'AI SecOps Coprocessor'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase font-sans">
          {t('sidebar', 'workspace')}
        </div>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) || (item.href === '/alerts' && pathname === '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-[#EFECE3] text-[#C2593F] font-semibold border-l-2 border-[#C2593F] pl-3.5'
                  : 'text-stone-600 hover:bg-[#F0EDE4] hover:text-[#1E2022] border-l-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C2593F]' : 'text-stone-500'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Dummy/Roadmap categories */}
        <div className="pt-6 px-3 mb-2 text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase font-sans">
          {t('sidebar', 'systemControl')}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-stone-500 cursor-not-allowed select-none rounded">
            <Cpu className="w-3.5 h-3.5 text-stone-400" />
            <span>{t('sidebar', 'coprocessor')}</span>
            <span className="ml-auto text-[8px] bg-[#EAE9E4] text-[#6B6D70] px-1.5 py-0.5 rounded font-mono font-medium">{t('sidebar', 'running')}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-stone-500 cursor-not-allowed select-none rounded">
            <Terminal className="w-3.5 h-3.5 text-stone-400" />
            <span>{t('sidebar', 'decider')}</span>
            <span className="ml-auto text-[8px] bg-[#EFECE3] text-[#C2593F] px-1.5 py-0.5 rounded font-mono font-medium">{t('sidebar', 'ready')}</span>
          </div>
        </div>
      </nav>

      {/* Language Switcher Pill Control */}
      <div className="px-6 py-3 border-t border-[#EAE9E4] flex items-center justify-center gap-1 text-xs bg-[#FAF9F5]">
        <button
          onClick={() => setLanguage('zh')}
          className={`px-3 py-1 rounded border transition-all duration-150 font-medium ${
            language === 'zh'
              ? 'bg-[#EFECE3] border-[#C2593F] text-[#C2593F] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#F0EDE4]'
          }`}
        >
          简体中文
        </button>
        <span className="text-stone-300">|</span>
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded border transition-all duration-150 font-medium ${
            language === 'en'
              ? 'bg-[#EFECE3] border-[#C2593F] text-[#C2593F] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#F0EDE4]'
          }`}
        >
          English
        </button>
      </div>

      {/* Footer Health Check */}
      <div className="p-4 border-t border-[#EAE9E4] bg-[#F2EFE8] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded bg-[#FAF9F5] border border-[#EAE9E4]">
          <div className="relative flex items-center justify-center">
            {healthStatus === 'online' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            )}
            {healthStatus === 'connecting' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            )}
            {healthStatus === 'offline' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="text-[9px] text-[#6B6D70] font-sans font-bold uppercase tracking-wider block leading-none">
              {t('sidebar', 'backendStatus')}
            </span>
            <span className="text-xs font-semibold font-mono text-[#1E2022] truncate block mt-0.5">
              {healthStatus === 'online' && t('sidebar', 'serviceOnline')}
              {healthStatus === 'connecting' && t('sidebar', 'serviceConnecting')}
              {healthStatus === 'offline' && t('sidebar', 'serviceOffline')}
            </span>
          </div>
          <Activity className={`w-3.5 h-3.5 ${healthStatus === 'online' ? 'text-emerald-600' : 'text-stone-400'}`} />
        </div>

        <div className="flex items-center gap-3 px-3 py-2 rounded bg-[#FAF9F5] border border-[#EAE9E4]">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                imStatus?.enabled
                  ? imStatus.callback_enabled
                    ? 'bg-emerald-600'
                    : 'bg-amber-500'
                  : 'bg-stone-400'
              }`}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="text-[9px] text-[#6B6D70] font-sans font-bold uppercase tracking-wider block leading-none">
              {language === 'zh' ? '钉钉集成' : 'DingTalk IM'}
            </span>
            <span className="text-xs font-semibold font-mono text-[#1E2022] truncate block mt-0.5">
              {imStatus?.enabled
                ? imStatus.callback_enabled
                  ? language === 'zh'
                    ? '互动卡片审批已启用'
                    : 'Card approval enabled'
                  : language === 'zh'
                    ? '通知已启用'
                    : 'Notifications enabled'
                : language === 'zh'
                  ? '未启用'
                  : 'Disabled'}
            </span>
          </div>
          <MessageSquare
            className={`w-3.5 h-3.5 ${
              imStatus?.enabled ? 'text-emerald-600' : 'text-stone-400'
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
