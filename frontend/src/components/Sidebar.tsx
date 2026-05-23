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
  MessageSquare,
  Settings2,
  Sun,
  Moon
} from 'lucide-react';
import { api, type IMStatus, type LLMStatus } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [imStatus, setIMStatus] = useState<IMStatus | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.checkHealth();
        if (res?.status === 'ok') {
          setHealthStatus('online');
          const [im, llm] = await Promise.all([
            api.getIMStatus(),
            api.getLLMStatus(),
          ]);
          setIMStatus(im);
          setLLMStatus(llm);
        } else {
          setHealthStatus('offline');
          setIMStatus(null);
          setLLMStatus(null);
        }
      } catch {
        setHealthStatus('offline');
        setIMStatus(null);
        setLLMStatus(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: t('sidebar', 'alertInbox'), href: '/alerts', icon: ShieldAlert },
    { name: t('sidebar', 'evalDashboard'), href: '/evals', icon: Workflow },
    { name: t('sidebar', 'llmConfig'), href: '/settings/llm', icon: Settings2 },
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
              className={`grid h-10 grid-cols-[16px_minmax(0,1fr)] items-center gap-3 px-4 rounded font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-[#EFECE3] text-[#C2593F] font-semibold border-l-2 border-[#C2593F] pl-3.5'
                  : 'text-stone-600 hover:bg-[#F0EDE4] hover:text-[#1E2022] border-l-2 border-transparent'
              }`}
              title={item.name}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C2593F]' : 'text-stone-500'}`} />
              <span className="min-w-0 truncate whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}

        {/* System Status */}
        <div className="pt-6 px-3 mb-2 text-[10px] font-bold text-[#6B6D70] tracking-wider uppercase font-sans">
          {t('sidebar', 'systemStatus')}
        </div>
        <div className="space-y-0.5">
          {/* AI Coprocessor */}
          <StatusRow
            title={t('sidebar', 'coprocessorTip')}
            icon={<Cpu className={`w-4 h-4 transition-colors ${llmStatus?.enabled ? 'text-violet-500 group-hover:text-violet-600' : 'text-stone-400 group-hover:text-stone-500'}`} />}
            label={t('sidebar', 'coprocessor')}
            badge={llmStatus?.enabled ? t('sidebar', 'running') : t('sidebar', 'dtDisabled')}
            badgeClass={llmStatus?.enabled ? 'bg-[#F1EAFE] text-violet-700' : 'bg-[#EAE9E4] text-[#6B6D70]'}
          />

          {/* Auto Decider */}
          <StatusRow
            title={t('sidebar', 'deciderTip')}
            icon={<Terminal className="w-4 h-4 text-stone-400 group-hover:text-stone-500 transition-colors" />}
            label={t('sidebar', 'decider')}
            badge={t('sidebar', 'ready')}
            badgeClass="bg-[#EFECE3] text-[#C2593F]"
          />

          {/* Backend API */}
          <StatusRow
            title={t('sidebar', 'backendStatusTip')}
            icon={<Activity className={`w-4 h-4 transition-colors ${healthStatus === 'online' ? 'text-emerald-500 group-hover:text-emerald-600' : 'text-stone-400 group-hover:text-stone-500'}`} />}
            label={t('sidebar', 'backendStatus')}
            badge={
              healthStatus === 'online' ? t('sidebar', 'serviceOnline') :
              healthStatus === 'connecting' ? t('sidebar', 'serviceConnecting') :
              t('sidebar', 'serviceOffline')
            }
            badgeClass={
              healthStatus === 'online' ? 'bg-[#EAF5EF] text-emerald-700' :
              healthStatus === 'connecting' ? 'bg-[#FFF4E5] text-amber-600' :
              'bg-[#FCE8E6] text-rose-700'
            }
          />

          {/* IM Collaboration */}
          <StatusRow
            title={imStatus?.enabled
              ? (imStatus.callback_enabled ? t('sidebar', 'dtFullTip') : t('sidebar', 'dtNotifyTip'))
              : t('sidebar', 'dtDisabledTip')}
            icon={<MessageSquare className={`w-4 h-4 transition-colors ${imStatus?.enabled ? 'text-blue-500 group-hover:text-blue-600' : 'text-stone-400 group-hover:text-stone-500'}`} />}
            label={t('sidebar', 'imCollaboration')}
            badge={
              imStatus?.enabled
                ? (imStatus.callback_enabled ? t('sidebar', 'dtFull') : t('sidebar', 'dtNotify'))
                : t('sidebar', 'dtDisabled')
            }
            badgeClass={
              imStatus?.enabled
                ? (imStatus.callback_enabled ? 'bg-[#E6F0FD] text-blue-700' : 'bg-[#EAF5EF] text-emerald-700')
                : 'bg-[#EAE9E4] text-[#6B6D70]'
            }
          />
        </div>
      </nav>

      {/* Footer Controls (Language + Theme Switcher) */}
      <div className="px-5 py-3 border-t border-[#EAE9E4] flex items-center justify-between text-xs bg-[#FAF9F5] transition-colors duration-200">
        {/* Language Switcher */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => setLanguage('zh')}
            className={`transition-all duration-150 cursor-pointer font-bold ${
              language === 'zh'
                ? 'text-[#C2593F]'
                : 'text-stone-500 hover:text-[#C2593F]'
            }`}
          >
            中文
          </button>
          <span className="text-stone-300 dark:text-stone-700">/</span>
          <button
            onClick={() => setLanguage('en')}
            className={`transition-all duration-150 cursor-pointer font-bold ${
              language === 'en'
                ? 'text-[#C2593F]'
                : 'text-stone-500 hover:text-[#C2593F]'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={mounted ? (theme === 'light' ? (language === 'zh' ? '切换至深色模式' : 'Switch to Dark Mode') : (language === 'zh' ? '切换至浅色模式' : 'Switch to Light Mode')) : ''}
          className="p-1.5 rounded-full border border-transparent hover:border-[#EAE9E4] hover:bg-[#F5F3EB] text-stone-500 hover:text-[#C2593F] transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
        >
          {mounted ? (
            theme === 'light' ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>
      </div>


    </aside>
  );
}

function StatusRow({
  title,
  icon,
  label,
  badge,
  badgeClass,
}: {
  title: string;
  icon: React.ReactNode;
  label: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <div
      title={title}
      className="grid h-9 grid-cols-[16px_minmax(0,1fr)_56px] items-center gap-3 px-4 text-[13px] font-medium text-stone-600 cursor-help select-none rounded group relative hover:bg-[#F0EDE4] transition-colors"
    >
      <div className="flex items-center justify-center">{icon}</div>
      <span className="min-w-0 truncate whitespace-nowrap" title={label}>
        {label}
      </span>
      <span
        className={`inline-flex h-5 w-14 items-center justify-center rounded px-1 text-center font-mono text-[9px] leading-none ${badgeClass}`}
        title={badge}
      >
        <span className="max-w-full truncate">{badge}</span>
      </span>
    </div>
  );
}
