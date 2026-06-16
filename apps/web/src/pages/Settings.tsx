import { Download, FileText, Globe, LogOut, Mail, Monitor, Moon, Phone, Sun, UserRound } from "lucide-react";
import { api, USE_MOCKS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";
import { SectionCard } from "@/components/ui/Card";
import { languageNames, type Lang } from "@/i18n/dictionaries";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function Settings() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { lang, setLang, t } = useI18n();

  const themeOptions: Array<{ key: ThemeMode; label: string; icon: typeof Sun }> = [
    { key: "light", label: t("settings.light"), icon: Sun },
    { key: "dark", label: t("settings.dark"), icon: Moon },
    { key: "system", label: t("settings.system"), icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile */}
      <SectionCard title="Profile">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
            {initials(user?.name || user?.mobile || "FO")}
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{user?.name ?? "Fleet Owner"}</p>
            <div className="flex flex-col gap-0.5 text-sm text-slate-500 dark:text-slate-400">
              {user?.mobile && <span className="flex items-center gap-1.5"><Phone size={13} /> {user.mobile}</span>}
              {user?.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {user.email}</span>}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title={t("settings.appearance")}>
        <div className="space-y-5">
          <div>
            <p className="label flex items-center gap-2"><UserRound size={13} /> {t("settings.theme")}</p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition",
                    mode === key ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-ink-600 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-ink-600",
                  )}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label flex items-center gap-2"><Globe size={13} /> {t("settings.language")}</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(languageNames) as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-xl border-2 py-3 text-sm font-semibold transition",
                    l === lang ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-ink-600 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-ink-600",
                  )}
                >
                  {languageNames[l]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Reports */}
      <SectionCard title="Reports & Export" subtitle={USE_MOCKS ? "Connect the backend to enable downloads" : "Download your fleet reports"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReportLink kind="fleet.pdf" icon={<FileText size={18} />} label="Profit PDF" disabled={USE_MOCKS} />
          <ReportLink kind="profit.csv" icon={<Download size={18} />} label="Profit CSV" disabled={USE_MOCKS} />
          <ReportLink kind="loads.csv" icon={<Download size={18} />} label="Loads CSV" disabled={USE_MOCKS} />
        </div>
      </SectionCard>

      <button onClick={logout} className="btn-danger w-full">
        <LogOut size={18} /> {t("settings.logout")}
      </button>

      <p className="text-center text-xs text-slate-400">Fleet Owner · v2.0 · Built for lorry & container owners</p>
    </div>
  );
}

function ReportLink({ kind, icon, label, disabled }: { kind: "profit.csv" | "loads.csv" | "fleet.pdf"; icon: React.ReactNode; label: string; disabled?: boolean }) {
  if (disabled) {
    return <span className="btn-ghost cursor-not-allowed opacity-50">{icon} {label}</span>;
  }
  return (
    <button onClick={() => api.downloadReport(kind).catch((e) => alert(`Export failed: ${e.message}`))} className="btn-ghost">{icon} {label}</button>
  );
}
