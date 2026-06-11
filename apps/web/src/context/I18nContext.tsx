import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { baseDict, dictionaries, type DictKey, type Lang } from "@/i18n/dictionaries";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "fleet.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    return stored && stored in dictionaries ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[lang] ?? {};
    return {
      lang,
      setLang: setLangState,
      t: (key) => dict[key] ?? baseDict[key] ?? key,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
