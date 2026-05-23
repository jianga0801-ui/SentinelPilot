"use client";

import React, { createContext, useContext, useState } from 'react';
import {
  getTranslationEntry,
  translations,
  type TranslationEntry,
} from './translations';

export type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: string, key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'zh';
    const saved = window.localStorage.getItem('sentinel_lang') as Language;
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
    return window.navigator.language.startsWith('en') ? 'en' : 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sentinel_lang', lang);
  };

  const t = (section: string, key: string, fallback?: string): string => {
    const sect = (translations as Record<string, unknown>)[section];
    if (!sect) return fallback || `${section}.${key}`;

    // Support nested dot-notation keys, e.g. "statusLabel.completed"
    let term: unknown = sect;
    const parts = key.split('.');
    for (const part of parts) {
      if (term && typeof term === 'object') {
        term = (term as Record<string, unknown>)[part];
      } else {
        term = undefined;
        break;
      }
    }

    if (!term) return fallback || `${section}.${key}`;
    const entry = getTranslationEntry({ term: term as TranslationEntry }, 'term');
    return entry?.[language] || entry?.en || fallback || `${section}.${key}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
