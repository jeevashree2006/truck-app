import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';

export type Locale = 'en' | 'ta' | 'hi';

export const SUPPORTED_LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

const DICTIONARIES: Record<Locale, Record<string, unknown>> = { en, ta, hi };

const STORAGE_KEY = 'fleet.locale';

/** Resolve a dotted key path against a nested dictionary. */
function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replace {placeholder} tokens with provided params. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function detectDeviceLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode ?? 'en';
    if (code === 'ta' || code === 'hi') return code;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'ta' || stored === 'hi') {
          setLocaleState(stored);
        } else {
          setLocaleState(detectDeviceLocale());
        }
      })
      .catch(() => setLocaleState(detectDeviceLocale()));
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const t = useCallback<TFunction>(
    (key, params) => {
      const fromLocale = lookup(DICTIONARIES[locale], key);
      const value = fromLocale ?? lookup(DICTIONARIES.en, key) ?? key;
      return interpolate(value, params);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT(): TFunction {
  return useI18n().t;
}
