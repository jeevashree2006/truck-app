import type { VehicleStatus } from "@/types";
import { vehicleStatusMeta } from "@/lib/format";
import { cn } from "@/lib/cn";

export function StatusChip({ status, className }: { status: VehicleStatus; className?: string }) {
  const meta = vehicleStatusMeta[status];
  return (
    <span className={cn("pill", className)} style={{ backgroundColor: meta.bg, color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
}
