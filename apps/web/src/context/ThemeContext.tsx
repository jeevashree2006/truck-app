import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = "fleet.theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemPrefersDark());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
    return stored ?? "system";
  });
  const [isDark, setIsDark] = useState<boolean>(() => resolveDark(mode));

  useEffect(() => {
    const dark = resolveDark(mode);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // React to OS theme changes while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const dark = mql.matches;
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      isDark,
      setMode: setModeState,
      toggle: () => setModeState((m) => (resolveDark(m) ? "light" : "dark")),
    }),
    [mode, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
