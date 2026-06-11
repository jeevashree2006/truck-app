import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  icon,
  accent = "#2563eb",
  prefix,
  suffix,
  delta,
  format,
  index = 0,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: string;
  prefix?: string;
  suffix?: string;
  delta?: number | null;
  format?: (n: number) => string;
  index?: number;
}) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString("en-IN");
  const positive = (delta ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="card card-hover relative overflow-hidden p-5"
    >
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] blur-xl"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          {icon}
        </div>
        {delta != null && (
          <span
            className={cn(
              "pill",
              positive ? "bg-status-valid/12 text-status-valid" : "bg-status-expired/12 text-status-expired",
            )}
          >
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {prefix}
        {display}
        {suffix}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}
