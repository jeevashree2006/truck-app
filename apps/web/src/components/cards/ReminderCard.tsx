import { motion } from "framer-motion";
import { AlertTriangle, FileWarning } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReminderCard as Reminder } from "@/types";

const severityStyles: Record<string, { bar: string; bg: string; text: string }> = {
  high: { bar: "#ef4444", bg: "rgba(239,68,68,0.10)", text: "#ef4444" },
  medium: { bar: "#f59e0b", bg: "rgba(245,158,11,0.10)", text: "#d97706" },
  low: { bar: "#3b82f6", bg: "rgba(59,130,246,0.10)", text: "#2563eb" },
};

export function ReminderCard({ reminder, index = 0 }: { reminder: Reminder; index?: number }) {
  const s = severityStyles[reminder.severity] ?? severityStyles.medium;
  const Icon = reminder.type === "document_expiry" ? FileWarning : AlertTriangle;
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition hover:shadow-soft dark:border-ink-600 dark:bg-ink-700"
    >
      <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: s.bar }} />
      <div
        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{reminder.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{reminder.body}</p>
      </div>
    </motion.div>
  );

  return reminder.vehicle_id ? (
    <Link to={`/vehicles/${reminder.vehicle_id}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
