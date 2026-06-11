import { useState } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useI18n } from "@/context/I18nContext";
import { VehicleCard } from "@/components/cards/VehicleCard";
import { Modal } from "@/components/ui/Modal";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { vehicleStatusMeta } from "@/lib/format";

export default function Vehicles() {
  const { t } = useI18n();
  const { data, loading, reload } = useAsync(() => api.listVehicles(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const filtered = (data ?? [])
    .filter((v) => !status || v.status === status)
    .filter((v) => [v.registration_number, v.make, v.model].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${t("common.search")} vehicles...`} className="input pl-10" />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-auto"
            options={[{ value: "", label: "All status" }, ...VEHICLE_STATUSES.map((s) => ({ value: s, label: vehicleStatusMeta[s].label }))]}
          />
        </div>
        <Button onClick={() => setOpen(true)} icon={<Plus size={18} />} className="hidden sm:inline-flex">
          {t("vehicles.add")}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Truck size={26} />}
          title={query || status ? "No matches" : t("vehicles.empty")}
          description={query || status ? "Try a different search or filter." : "Enroll your first lorry or container to start tracking loads, documents and profit."}
          action={!query && !status && <Button onClick={() => setOpen(true)} icon={<Plus size={18} />}>{t("vehicles.add")}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v, i) => <VehicleCard key={v.id} vehicle={v} index={i} />)}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t("vehicles.add")} maxWidth="max-w-2xl">
        <VehicleForm onCancel={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />
      </Modal>

      <div className="sm:hidden"><FAB onClick={() => setOpen(true)} label={t("vehicles.add")} /></div>
    </div>
  );
}
