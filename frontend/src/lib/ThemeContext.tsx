'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentTheme = 'violet' | 'azure' | 'jade' | 'ember';

export const accentThemes: Array<{ id: AccentTheme; zh: string; en: string; swatch: string }> = [
  { id: 'violet', zh: '紫晶', en: 'Violet', swatch: 'oklch(0.61 0.21 292)' },
  { id: 'azure', zh: '亮蓝', en: 'Azure', swatch: 'oklch(0.66 0.18 244)' },
  { id: 'jade', zh: '青玉', en: 'Jade', swatch: 'oklch(0.64 0.14 165)' },
  { id: 'ember', zh: '赤陶', en: 'Ember', swatch: 'oklch(0.62 0.17 35)' },
];

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentTheme;
  theme: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const MODE_KEY = 'sentinel_theme_mode';
const ACCENT_KEY = 'sentinel_theme_accent';

const toMode = (value: string | null | undefined): ThemeMode | null => {
  return value === 'light' || value === 'dark' ? value : null;
};

const toAccent = (value: string | null | undefined): AccentTheme | null => {
  return accentThemes.some((item) => item.id === value) ? (value as AccentTheme) : null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<AccentTheme>('violet');

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const saved = toMode(window.localStorage.getItem(MODE_KEY));
        const preferredMode = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setModeState(preferredMode);
        setAccentState(toAccent(window.localStorage.getItem(ACCENT_KEY)) ?? 'violet');
      } catch {
        // Storage access can be blocked in restricted browser contexts.
      }
    });

    return () => cancelAnimationFrame(handle);
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // Storage access can be blocked in restricted browser contexts.
    }
  };

  const setAccent = (next: AccentTheme) => {
    setAccentState(next);
    try {
      window.localStorage.setItem(ACCENT_KEY, next);
    } catch {
      // Storage access can be blocked in restricted browser contexts.
    }
  };

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.theme = accent;
    root.style.colorScheme = mode;
  }, [accent, mode]);

  return (
    <ThemeContext.Provider value={{ mode, accent, theme: mode, setMode, setAccent, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
