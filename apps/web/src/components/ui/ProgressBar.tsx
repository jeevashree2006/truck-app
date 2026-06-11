import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Animated progress bar. Colour shifts green → amber → red as the value rises,
 * or use an explicit `color`. Values are clamped to [0, 1]; >1 overflows shown red.
 */
export function ProgressBar({
  value,
  color,
  className,
  height = 8,
  trackClassName,
}: {
  value: number | null | undefined;
  color?: string;
  className?: string;
  height?: number;
  trackClassName?: string;
}) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const over = (value ?? 0) > 1;
  const auto = over || v >= 1 ? "#ef4444" : v >= 0.8 ? "#f59e0b" : v >= 0.5 ? "#eab308" : "#16a34a";
  const fill = color ?? auto;
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-ink-600", trackClassName, className)}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: fill }}
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}
