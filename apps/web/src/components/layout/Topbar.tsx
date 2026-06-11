import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, FileWarning, Globe, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { languageNames, type Lang } from "@/i18n/dictionaries";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ReminderCard } from "@/types";

const sevColor = (s: string) => (s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#3b82f6");

export function Topbar({
  title,
  reminders = [],
  loadingReminders = false,
}: {
  title: string;
  reminders?: ReminderCard[];
  loadingReminders?: boolean;
}) {
  const { mode, setMode } = useTheme();
  const { lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<null | "lang" | "user" | "notif">(null);

  const themeIcons: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
  const cycle: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = themeIcons[mode];
  const count = reminders.length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 backdrop-blur-md dark:border-ink-600 dark:bg-ink-900/80 sm:px-6">
      <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
        {title}
      </h1>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setMode(cycle[mode])}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-600"
          title={`Theme: ${mode}`}
        >
          <ThemeIcon size={19} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === "lang" ? null : "lang")}
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-600"
          >
            <Globe size={19} />
            <span className="hidden text-xs font-bold uppercase sm:inline">{lang}</span>
          </button>
          <AnimatePresence>
            {menu === "lang" && (
              <Dropdown onClose={() => setMenu(null)} align="right">
                {(Object.keys(languageNames) as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      setMenu(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-ink-600",
                      l === lang ? "font-bold text-brand-600" : "text-slate-600 dark:text-slate-300",
                    )}
                  >
                    {languageNames[l]}
                    {l === lang && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                  </button>
                ))}
              </Dropdown>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setMenu(menu === "notif" ? null : "notif")}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-600"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {count > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-expired px-1 text-[10px] font-bold text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
          <AnimatePresence>
            {menu === "notif" && (
              <Dropdown onClose={() => setMenu(null)} align="right" widthClass="w-[320px]">
                <div className="mb-1 flex items-center justify-between px-2 pb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</span>
                  {count > 0 && (
                    <span className="pill bg-status-expired/12 text-status-expired">{count}</span>
                  )}
                </div>
                {loadingReminders ? (
                  <div className="px-2 py-6 text-center text-sm text-slate-400">Loading…</div>
                ) : count === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-2 py-7 text-center">
                    <BellOff size={22} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All clear — no alerts</p>
                  </div>
                ) : (
                  <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
                    {reminders.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setMenu(null);
                          if (r.vehicle_id) navigate(`/vehicles/${r.vehicle_id}`);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-ink-600"
                      >
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${sevColor(r.severity)}1f`, color: sevColor(r.severity) }}
                        >
                          <FileWarning size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{r.body}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Dropdown>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === "user" ? null : "user")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow"
          >
            {initials(user?.name || user?.email || "Fleet Owner")}
          </button>
          <AnimatePresence>
            {menu === "user" && (
              <Dropdown onClose={() => setMenu(null)} align="right">
                <div className="border-b border-slate-100 px-3 pb-2 dark:border-ink-600">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name ?? "Fleet Owner"}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email ?? user?.mobile}</p>
                </div>
                <button
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-status-expired transition hover:bg-status-expired/10"
                >
                  <LogOut size={16} /> Log out
                </button>
              </Dropdown>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function Dropdown({
  children,
  onClose,
  align = "left",
  widthClass = "w-52",
}: {
  children: React.ReactNode;
  onClose: () => void;
  align?: "left" | "right";
  widthClass?: string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={cn("card absolute z-20 mt-2 p-2", widthClass, align === "right" ? "right-0" : "left-0")}
      >
        {children}
      </motion.div>
    </>
  );
}
