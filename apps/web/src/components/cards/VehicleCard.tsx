import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, IndianRupee, Truck } from "lucide-react";
import type { Vehicle } from "@/types";
import { DocStatusChip } from "@/components/ui/DocStatusChip";
import { StatusChip } from "@/components/ui/StatusChip";
import { compactMoney, docStatusMeta, documentLabels, vehicleTypeSummary } from "@/lib/format";

export function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  const flagged = vehicle.document_statuses.filter((d) => d.status === "expired" || d.status === "expiring");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="h-full"
    >
      <Link to={`/vehicles/${vehicle.id}`} className="card card-hover group flex h-full flex-col overflow-hidden p-0">
        <div className="relative bg-brand-gradient px-5 py-4 text-white">
          <div className="absolute inset-0 opacity-20 [background:radial-gradient(120px_60px_at_85%_-10%,#fff,transparent)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Truck size={22} />
              </div>
              <div>
                <p className="text-base font-bold tracking-wide">{vehicle.registration_number}</p>
                <p className="text-xs text-white/80">{vehicleTypeSummary(vehicle)}</p>
              </div>
            </div>
            <ChevronRight className="text-white/70 transition group-hover:translate-x-0.5" size={20} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between">
            <StatusChip status={vehicle.status} />
            <DocStatusChip status={vehicle.overall_doc_status} size="sm" />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <IndianRupee size={16} className="text-status-valid" />
              <span className="text-sm">
                <span className="font-bold text-slate-900 dark:text-white">{compactMoney(vehicle.total_profit)}</span> profit
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400">{vehicle.trips_count} trips</span>
          </div>

          {/* Document status strip — pinned to the bottom so all cards align */}
          <div className="mt-auto pt-4">
            <div className="grid grid-cols-8 gap-1">
              {vehicle.document_statuses.map((d) => (
                <div key={d.type} className="text-center" title={`${documentLabels[d.type]}: ${docStatusMeta[d.status].label}`}>
                  <div
                    className="h-1.5 w-full rounded-full"
                    style={{ backgroundColor: docStatusMeta[d.status].color, opacity: d.status === "unknown" ? 0.3 : 1 }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 min-h-[1rem] text-xs font-medium text-status-expiring">
              {flagged.length > 0 ? `${flagged.length} document${flagged.length > 1 ? "s" : ""} need attention` : ""}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
