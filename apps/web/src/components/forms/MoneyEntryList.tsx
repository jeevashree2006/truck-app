import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { MoneyEntry } from "@/types";
import { money } from "@/lib/format";

/**
 * Repeatable money rows (used for diesel fills and driver advances). Each row is an
 * editable amount + optional note; the running total is shown in the header.
 */
export function MoneyEntryList({
  label,
  accent,
  entries,
  onChange,
}: {
  label: string;
  accent: string;
  entries: MoneyEntry[];
  onChange: (entries: MoneyEntry[]) => void;
}) {
  const total = entries.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  const update = (i: number, patch: Partial<MoneyEntry>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, { amount: 0, note: "" }]);

  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-ink-600">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
          {label}
        </span>
        <span className="text-sm font-bold" style={{ color: accent }}>{money(total)}</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {entries.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              <input
                type="number"
                value={e.amount || ""}
                onChange={(ev) => update(i, { amount: Number(ev.target.value) })}
                placeholder="Amount"
                className="input w-32 py-2"
              />
              <input
                value={e.note ?? ""}
                onChange={(ev) => update(i, { note: ev.target.value })}
                placeholder="Note (optional)"
                className="input flex-1 py-2"
              />
              <button type="button" onClick={() => remove(i)} className="rounded-lg p-2 text-slate-300 transition hover:bg-status-expired/10 hover:text-status-expired">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-100 dark:hover:bg-ink-600"
        style={{ color: accent }}
      >
        <Plus size={14} /> Add {label.toLowerCase()}
      </button>
    </div>
  );
}
