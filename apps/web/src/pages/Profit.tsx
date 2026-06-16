import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, IndianRupee, Receipt, TrendingUp, Truck } from "lucide-react";
import { api, USE_MOCKS } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useI18n } from "@/context/I18nContext";
import { SectionCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { compactMoney, fmtDate, money, tripStatusMeta } from "@/lib/format";
import type { TripProfitRow } from "@/types";

export default function Profit() {
  const { t } = useI18n();
  const vehicles = useAsync(() => api.profitByVehicle(), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  const grandProfit = (vehicles.data ?? []).reduce((a, v) => a + v.total_profit, 0);
  const grandTrips = (vehicles.data ?? []).reduce((a, v) => a + v.trips_count, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard icon={<IndianRupee size={20} />} label="Total profit" value={money(grandProfit)} accent="#16a34a" className="col-span-2 sm:col-span-1" />
        <SummaryCard icon={<Receipt size={20} />} label="Completed trips" value={String(grandTrips)} accent="#2563eb" />
        <SummaryCard icon={<Truck size={20} />} label="Vehicles" value={String(vehicles.data?.length ?? 0)} accent="#7c3aed" />
      </div>

      <SectionCard
        title={t("profit.title")}
        subtitle="Tap a vehicle to see every trip's profit"
        action={
          !USE_MOCKS ? (
            <button onClick={() => api.downloadReport("profit.csv").catch((e) => alert(`Export failed: ${e.message}`))} className="btn-ghost"><Download size={16} /> CSV</button>
          ) : null
        }
      >
        {vehicles.loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (vehicles.data ?? []).length === 0 ? (
          <EmptyState icon={<TrendingUp size={24} />} title="No data yet" description="Add a vehicle and complete a load to see profit." />
        ) : (
          <div className="space-y-3">
            {vehicles.data!.map((v, i) => (
              <motion.div
                key={v.vehicle_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-slate-100 dark:border-ink-600"
              >
                <button
                  onClick={() => setExpanded(expanded === v.vehicle_id ? null : v.vehicle_id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50 dark:hover:bg-ink-700 sm:gap-4 sm:p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white sm:h-11 sm:w-11"><Truck size={18} className="sm:h-5 sm:w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">{v.registration_number}</p>
                    <p className="text-[11px] text-slate-400 sm:text-xs">{v.trips_count} trips</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold sm:text-base" style={{ color: v.total_profit >= 0 ? "#16a34a" : "#ef4444" }}>{money(v.total_profit)}</p>
                    <p className="text-[11px] text-slate-400 sm:text-xs">Rent {compactMoney(v.total_rent)}</p>
                  </div>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition sm:h-[18px] sm:w-[18px] ${expanded === v.vehicle_id ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {expanded === v.vehicle_id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 dark:border-ink-600">
                      <VehicleTrips vehicleId={v.vehicle_id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function VehicleTrips({ vehicleId }: { vehicleId: string }) {
  const trips = useAsync(() => api.vehicleTrips(vehicleId), [vehicleId]);

  if (trips.loading) {
    return <div className="space-y-2 p-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  if (!trips.data || trips.data.length === 0) {
    return <p className="p-5 text-sm text-slate-400">No trips for this vehicle yet.</p>;
  }

  return (
    <div className="divide-y divide-slate-100 bg-slate-50/60 dark:divide-ink-600 dark:bg-ink-800/40">
      {trips.data.map((trip: TripProfitRow) => {
        const meta = tripStatusMeta[trip.status as keyof typeof tripStatusMeta] ?? tripStatusMeta.completed;
        return (
          <Link key={trip.load_id} to={`/loads/${trip.load_id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white dark:hover:bg-ink-700">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{trip.route}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="pill" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                {trip.end_date && <span>{fmtDate(trip.end_date)}</span>}
                <span>Rent {compactMoney(trip.rent)}</span>
                <span>Spend {compactMoney(trip.spend)}</span>
              </div>
            </div>
            <span className="text-sm font-bold" style={{ color: trip.profit >= 0 ? "#16a34a" : "#ef4444" }}>{money(trip.profit)}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, className }: { icon: React.ReactNode; label: string; value: string; accent: string; className?: string }) {
  return (
    <div className={`card p-5${className ? ` ${className}` : ""}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1f`, color: accent }}>{icon}</div>
      <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
