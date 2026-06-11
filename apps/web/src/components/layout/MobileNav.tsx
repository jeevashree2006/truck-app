import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, TrendingUp, Truck } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/vehicles", icon: Truck, label: "Fleet" },
  { to: "/profit", icon: TrendingUp, label: "Profit" },
  { to: "/settings", icon: Settings, label: "More" },
];

export function MobileNav() {
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
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
