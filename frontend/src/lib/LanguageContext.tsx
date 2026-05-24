"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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
const LANGUAGE_COOKIE = 'sentinel_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const toLanguage = (value: string | null | undefined): Language | null => {
  return value === 'zh' || value === 'en' ? value : null;
};

const readCookieLanguage = (): Language | null => {
  if (typeof document === 'undefined') return null;

  try {
    const cookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${LANGUAGE_COOKIE}=`));

    return toLanguage(cookie?.split('=')[1]);
  } catch {
    return null;
  }
};

const writeCookieLanguage = (lang: Language) => {
  try {
    document.cookie = `${LANGUAGE_COOKIE}=${lang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Storage access can be blocked in restricted browser contexts.
  }
};

const readLocalStorageLanguage = (): Language | null => {
  try {
    return toLanguage(window.localStorage.getItem('sentinel_lang'));
  } catch {
    return null;
  }
};

const writeLocalStorageLanguage = (lang: Language) => {
  try {
    window.localStorage.setItem('sentinel_lang', lang);
  } catch {
    // Storage access can be blocked in restricted browser contexts.
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLanguage?: Language }> = ({
  children,
  initialLanguage = 'zh',
}) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const savedLanguage = readLocalStorageLanguage();
    const browserLanguage = window.navigator.language.startsWith('en') ? 'en' : 'zh';
    const preferredLanguage = readCookieLanguage() ?? savedLanguage ?? browserLanguage;
    const handle = requestAnimationFrame(() => {
      setLanguageState(preferredLanguage);
    });

    writeLocalStorageLanguage(preferredLanguage);
    writeCookieLanguage(preferredLanguage);

    return () => cancelAnimationFrame(handle);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    writeLocalStorageLanguage(lang);
    writeCookieLanguage(lang);
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
