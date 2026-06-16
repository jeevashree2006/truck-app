import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { useI18n } from "@/context/I18nContext";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/lib/api";
import type { DictKey } from "@/i18n/dictionaries";

const TITLES: Array<{ match: (p: string) => boolean; key: DictKey }> = [
  { match: (p) => p === "/", key: "nav.dashboard" },
  { match: (p) => p.startsWith("/vehicles"), key: "nav.vehicles" },
  { match: (p) => p.startsWith("/loads"), key: "nav.vehicles" },
  { match: (p) => p.startsWith("/drivers"), key: "nav.drivers" },
  { match: (p) => p.startsWith("/profit"), key: "nav.profit" },
  { match: (p) => p.startsWith("/settings"), key: "nav.settings" },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { t } = useI18n();
  const reminders = useAsync(() => api.reminders(), []);

  const title = t(TITLES.find((x) => x.match(pathname))?.key ?? "nav.dashboard");

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-ink-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} reminders={reminders.data ?? []} loadingReminders={reminders.loading} />
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
