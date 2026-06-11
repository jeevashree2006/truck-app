import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-slate-200/70 dark:bg-ink-600",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.4s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/5",
        className,
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-16" />
    </div>
  );
}
