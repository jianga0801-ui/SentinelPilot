'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ClipboardCheck,
  GitBranch,
  GripVertical,
  Languages,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sun,
  TerminalSquare,
  Workflow,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { accentThemes, useTheme } from '@/lib/ThemeContext';

const MIN_WIDTH = 220;
const MAX_WIDTH = 340;
const COLLAPSED_WIDTH = 72;

export default function Sidebar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { mode, accent, setAccent, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(256);
  const [mounted, setMounted] = useState(false);
  const [accentPickerOpen, setAccentPickerOpen] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      try {
        const savedWidth = Number(window.localStorage.getItem('sentinel_sidebar_width'));
        const savedCollapsed = window.localStorage.getItem('sentinel_sidebar_collapsed');
        if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
          setWidth(savedWidth);
        }
        if (savedCollapsed === 'true') {
          setCollapsed(true);
        }
      } catch {
        // Storage access can be blocked in restricted browser contexts.
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    const currentWidth = collapsed ? COLLAPSED_WIDTH : width;
    document.documentElement.style.setProperty('--sidebar-width', `${currentWidth}px`);
    if (!mounted) {
      return;
    }
    try {
      window.localStorage.setItem('sentinel_sidebar_width', String(width));
      window.localStorage.setItem('sentinel_sidebar_collapsed', String(collapsed));
    } catch {
      // Storage access can be blocked in restricted browser contexts.
    }
  });

  const navItems = useMemo(
    () => [
      { name: language === 'zh' ? '运行总览' : 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: t('sidebar', 'alertInbox'), href: '/alerts', icon: ShieldAlert },
      { name: language === 'zh' ? '研判任务' : 'Investigations', href: '/investigations', icon: GitBranch },
      { name: language === 'zh' ? '审批队列' : 'Approvals', href: '/approvals', icon: ClipboardCheck },
      { name: language === 'zh' ? '原始日志' : 'Raw Logs', href: '/logs/security', icon: ScrollText },
      { name: language === 'zh' ? '服务日志' : 'Service Logs', href: '/logs/service', icon: TerminalSquare },
      { name: t('sidebar', 'evalDashboard'), href: '/evals', icon: Workflow },
      { name: language === 'zh' ? '通知集成' : 'Integrations', href: '/integrations', icon: Bell },
      { name: language === 'zh' ? '系统设置' : 'Settings', href: '/settings', icon: Settings2 },
    ],
    [language, t],
  );

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setCollapsed(false);
    const startX = event.clientX;
    const startWidth = width;

    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX));
      setWidth(nextWidth);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const toggleSidebar = () => {
    if (collapsed) {
      setAccentPickerOpen(false);
    }
    setCollapsed((current) => !current);
  };

  const currentWidth = collapsed ? COLLAPSED_WIDTH : width;
  const accentGradient = `conic-gradient(${accentThemes.map((item) => item.swatch).join(', ')})`;

  return (
    <aside
      className="sp-sidebar fixed left-0 top-0 z-30 flex h-screen select-none flex-col border-r transition-[width] duration-200"
      style={{ width: currentWidth }}
    >
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <Link
          href="/dashboard"
          className={`flex min-w-0 items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
          title="SentinelPilot"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[oklch(0.985_0.01_82)] shadow-sm" style={{ background: 'var(--sp-accent)' }}>
            <Workflow className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight sp-text">SentinelPilot</h1>
              <span className="block truncate text-[11px] font-semibold sp-muted">
                {language === 'zh' ? '安全研判工作台' : 'Security Operations Desk'}
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hrefPath = item.href.split('?')[0].split('#')[0];
            const isExactRoute = !item.href.includes('?') && !item.href.includes('#');
            const isActive = isExactRoute && (pathname === hrefPath || (hrefPath !== '/' && pathname.startsWith(`${hrefPath}/`)));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sp-nav-item grid h-10 items-center rounded-md px-3 text-sm font-semibold transition-colors ${
                  collapsed ? 'grid-cols-1 justify-items-center' : 'grid-cols-[18px_minmax(0,1fr)] gap-3'
                } ${isActive ? 'sp-nav-item-active' : ''}`}
                title={item.name}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span className="min-w-0 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t px-3 py-3" style={{ borderColor: 'var(--sp-border)' }}>
        <div className={`mb-3 flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center justify-between gap-2'}`}>
          {collapsed ? (
            <div className="relative" title={language === 'zh' ? '主题色' : 'Accent theme'}>
              <button
                type="button"
                data-testid="accent-picker-trigger"
                onClick={() => setAccentPickerOpen((current) => !current)}
                className="h-5 w-5 rounded-full border transition-[transform,box-shadow,border-color] duration-150 hover:scale-110"
                style={{
                  backgroundImage: accentGradient,
                  borderColor: accentPickerOpen ? 'var(--sp-text)' : 'var(--sp-border)',
                  boxShadow: accentPickerOpen
                    ? '0 0 0 2px color-mix(in oklch, var(--sp-accent), transparent 72%)'
                    : 'none',
                }}
                aria-label={language === 'zh' ? '打开主题色选择' : 'Open accent picker'}
              />
              {accentPickerOpen && (
                <div
                  data-testid="accent-picker-ring"
                  className="absolute left-7 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border px-1.5 py-2 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--sp-surface), transparent 10%)',
                    borderColor: 'var(--sp-border)',
                    boxShadow: '0 12px 28px color-mix(in oklch, black, transparent 70%)',
                  }}
                >
                  {accentThemes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="accent-picker-option"
                      onClick={() => {
                        setAccent(item.id);
                        setAccentPickerOpen(false);
                      }}
                      className="h-5 w-5 rounded-full border transition-transform duration-150 hover:scale-110"
                      style={{
                        backgroundColor: item.swatch,
                        borderColor: accent === item.id ? 'var(--sp-text)' : 'var(--sp-border)',
                      }}
                      title={language === 'zh' ? item.zh : item.en}
                      aria-label={language === 'zh' ? `切换为${item.zh}主题` : `Switch to ${item.en} theme`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5" title={language === 'zh' ? '主题色' : 'Accent theme'}>
              {accentThemes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccent(item.id)}
                  className="h-5 w-5 rounded-full border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: item.swatch,
                    borderColor: accent === item.id ? 'var(--sp-text)' : 'var(--sp-border)',
                  }}
                  title={language === 'zh' ? item.zh : item.en}
                />
              ))}
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="sp-nav-item sp-hoverable flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            title={collapsed ? (language === 'zh' ? '展开侧栏' : 'Expand sidebar') : (language === 'zh' ? '收起侧栏' : 'Collapse sidebar')}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
          <div className={`relative h-8 overflow-hidden transition-[width] duration-200 ease-out ${collapsed ? 'w-8' : 'w-[72px]'}`}>
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className={`sp-nav-item sp-hoverable absolute inset-0 flex h-8 w-8 items-center justify-center rounded-md transition-[opacity,transform,color,background-color] duration-150 ${
                collapsed ? 'translate-x-0 opacity-100 delay-75' : 'pointer-events-none -translate-x-1 opacity-0 delay-0'
              }`}
              title={language === 'zh' ? '切换为英文' : 'Switch to Chinese'}
              aria-label={language === 'zh' ? '切换为英文' : 'Switch to Chinese'}
            >
              <Languages className="h-4 w-4 sp-muted" />
            </button>
            <div
              className={`absolute inset-y-0 left-0 flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold transition-[opacity,transform] duration-150 ${
                collapsed ? 'pointer-events-none translate-x-1 opacity-0 delay-0' : 'translate-x-0 opacity-100 delay-150'
              }`}
            >
              <button
                onClick={() => setLanguage('zh')}
                className={language === 'zh' ? 'sp-accent' : 'sp-muted'}
                title={language === 'zh' ? '切换为中文' : 'Switch to Chinese'}
              >
                中文
              </button>
              <span className="sp-muted">/</span>
              <button
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'sp-accent' : 'sp-muted'}
                title={language === 'zh' ? '切换为英文' : 'Switch to English'}
              >
                EN
              </button>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title={mounted ? (mode === 'light' ? (language === 'zh' ? '切换至深色模式' : 'Switch to dark mode') : (language === 'zh' ? '切换至浅色模式' : 'Switch to light mode')) : ''}
            className="sp-nav-item sp-hoverable flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            {mounted ? (mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />) : <div className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          onPointerDown={startResize}
          className="absolute right-0 top-0 flex h-full w-2 translate-x-1/2 cursor-col-resize items-center justify-center"
          title={language === 'zh' ? '拖动调整侧栏宽度' : 'Drag to resize sidebar'}
        >
          <GripVertical className="h-4 w-4 opacity-0 transition-opacity hover:opacity-60" />
        </div>
      )}
    </aside>
  );
}
