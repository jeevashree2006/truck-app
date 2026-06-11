import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { ChevronLeft, LayoutDashboard, Settings, TrendingUp, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/context/I18nContext";
import type { DictKey } from "@/i18n/dictionaries";

const items: Array<{ to: string; icon: typeof Truck; key: DictKey }> = [
  { to: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/vehicles", icon: Truck, key: "nav.vehicles" },
  { to: "/profit", icon: TrendingUp, key: "nav.profit" },
  { to: "/settings", icon: Settings, key: "nav.settings" },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur dark:border-ink-600 dark:bg-ink-800/80 lg:flex"
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <Truck size={20} />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            {t("app.name")}
          </motion.span>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-brand-gradient-soft text-brand-700 dark:text-brand-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-ink-600 dark:hover:text-slate-100",
                collapsed && "justify-center",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-rail"
                    className="absolute left-0 h-6 w-1 rounded-r-full bg-brand-600"
                  />
                )}
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span>{t(key)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="m-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-ink-600 dark:hover:bg-ink-600"
      >
        <ChevronLeft size={16} className={cn("transition", collapsed && "rotate-180")} />
        {!collapsed && "Collapse"}
      </button>
    </motion.aside>
  );
}
