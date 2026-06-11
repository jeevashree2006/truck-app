import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/** Floating action button — fixed bottom-right, with a soft glow + spring press. */
export function FAB({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-40 flex items-center gap-2 rounded-2xl bg-brand-gradient px-5 py-4 text-white shadow-glow lg:bottom-6 lg:right-6"
      aria-label={label ?? "Add"}
    >
      {icon ?? <Plus size={22} strokeWidth={2.6} />}
      {label && <span className="hidden text-sm font-semibold sm:inline">{label}</span>}
    </motion.button>
  );
}
