import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, TrendingUp, Truck, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/context/I18nContext";
import type { DictKey } from "@/i18n/dictionaries";

const items: Array<{ to: string; icon: typeof Truck; label: DictKey }> = [
  { to: "/", icon: LayoutDashboard, label: "nav.home" },
  { to: "/vehicles", icon: Truck, label: "nav.fleet" },
  { to: "/drivers", icon: Users, label: "nav.drivers" },
  { to: "/profit", icon: TrendingUp, label: "nav.profit" },
  { to: "/settings", icon: Settings, label: "nav.more" },
];

export function MobileNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-ink-600 dark:bg-ink-800/95 lg:hidden">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition",
              isActive ? "text-brand-600" : "text-slate-400",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="mobile-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" />}
              <Icon size={21} />
              {t(label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
