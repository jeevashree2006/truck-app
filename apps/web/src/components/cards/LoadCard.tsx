import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Layers, MapPin } from "lucide-react";
import type { Load } from "@/types";
import { compactMoney, fmtDate, money, tripStatusMeta } from "@/lib/format";

export function LoadCard({ load, index = 0 }: { load: Load; index?: number }) {
  const meta = tripStatusMeta[load.status];
  const profit = load.totals.profit;
  const profitColor = profit >= 0 ? "#16a34a" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link
        to={`/loads/${load.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-brand-200 hover:shadow-soft dark:border-ink-600 dark:bg-ink-700"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-600 dark:text-brand-300">
          {load.totals.leg_count > 1 ? <Layers size={20} /> : <MapPin size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{load.route || "New load"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{fmtDate(load.start_date)}</span>
            {load.totals.leg_count > 1 && <span>{load.totals.leg_count} legs</span>}
            <span>Rent {compactMoney(load.totals.total_rent)}</span>
            <span>Spend {compactMoney(load.totals.spend)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-extrabold" style={{ color: profitColor }} title={money(profit)}>
            {compactMoney(profit)}
          </span>
          <span className="pill" style={{ backgroundColor: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-brand-500" />
      </Link>
    </motion.div>
  );
}
