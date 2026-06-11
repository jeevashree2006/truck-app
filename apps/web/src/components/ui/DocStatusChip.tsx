import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import type { DocStatus } from "@/types";
import { docStatusMeta } from "@/lib/format";
import { cn } from "@/lib/cn";

const icons: Record<DocStatus, typeof CheckCircle2> = {
  valid: CheckCircle2,
  expiring: AlertTriangle,
  expired: XCircle,
  unknown: HelpCircle,
};

export function DocStatusChip({
  status,
  label,
  className,
  size = "md",
}: {
  status: DocStatus;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = docStatusMeta[status];
  const Icon = icons[status];
  return (
    <span
      className={cn("pill", size === "sm" && "px-2 py-0.5 text-[11px]", className)}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
      {label ?? meta.label}
    </span>
  );
}
