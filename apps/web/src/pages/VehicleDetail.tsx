import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useI18n } from "@/context/I18nContext";
import { SectionCard } from "@/components/ui/Card";
import { DocStatusChip } from "@/components/ui/DocStatusChip";
import { StatusChip } from "@/components/ui/StatusChip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadCard } from "@/components/cards/LoadCard";
import { Modal } from "@/components/ui/Modal";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { docStatusMeta, documentLabels, fmtDate, money, vehicleAge, vehicleStatusMeta, vehicleTypeSummary } from "@/lib/format";
import type { VehicleStatus } from "@/types";

type Tab = "loads" | "repairs" | "documents";

export default function VehicleDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const vehicle = useAsync(() => api.getVehicle(id), [id]);
  const loads = useAsync(() => api.listLoads({ vehicleId: id }), [id]);
  const repairs = useAsync(() => api.listRepairs(id), [id]);

  const [tab, setTab] = useState<Tab>("loads");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [creatingLoad, setCreatingLoad] = useState(false);

  const v = vehicle.data;

  async function startLoad() {
    if (!v) return;
    setCreatingLoad(true);
    try {
      const load = await api.createLoad({ vehicle_id: v.id });
      navigate(`/loads/${load.id}`);
    } finally {
      setCreatingLoad(false);
    }
  }

  async function setStatus(status: VehicleStatus) {
    await api.updateStatus(id, status);
    vehicle.reload();
  }

  async function remove() {
    await api.deleteVehicle(id);
    navigate("/vehicles", { replace: true });
  }

  if (vehicle.loading || !v) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const activeLoads = (loads.data ?? []).filter((l) => l.status === "ongoing");
  const pastLoads = (loads.data ?? []).filter((l) => l.status !== "ongoing");
  const repairTotal = (repairs.data ?? []).reduce((a, r) => a + r.amount, 0);

  const tabs: Array<{ key: Tab; label: string; icon: typeof Layers; count?: number }> = [
    { key: "loads", label: t("vehicle.loads"), icon: Layers, count: loads.data?.length },
    { key: "repairs", label: t("vehicle.repairs"), icon: Wrench, count: repairs.data?.length },
    { key: "documents", label: t("vehicle.documents"), icon: FileText, count: v.document_statuses.filter((d) => d.status !== "valid" && d.status !== "unknown").length || undefined },
  ];

  return (
    <div className="space-y-6">
      <Link to="/vehicles" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">
        <ArrowLeft size={16} /> Back to fleet
      </Link>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white sm:p-8">
        <div className="absolute inset-0 opacity-25 [background:radial-gradient(360px_160px_at_85%_-20%,#fff,transparent)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Truck size={30} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-wide">{v.registration_number}</h2>
              <p className="text-white/80">{vehicleTypeSummary(v)}{vehicleAge(v.manufacture_month) ? ` · ${vehicleAge(v.manufacture_month)}` : v.age_years != null ? ` · ${v.age_years} yr` : ""}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusChip status={v.status} className="!bg-white/20 !text-white" />
                <DocStatusChip status={v.overall_doc_status} size="sm" className="!bg-white/20 !text-white" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"><Pencil size={15} /> Edit</button>
            <button onClick={() => setDeleting(true)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"><Trash2 size={15} /></button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/15 pt-5">
          <div>
            <p className="text-xs text-white/70">Lifetime profit</p>
            <p className="text-xl font-extrabold">{money(v.total_profit)}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">Completed trips</p>
            <p className="text-xl font-extrabold">{v.trips_count}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/70">Status</span>
            <select
              value={v.status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className="cursor-pointer appearance-none rounded-xl border-none bg-white/90 bg-no-repeat py-2 pl-3 pr-9 text-sm font-bold text-brand-700 outline-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%231d4ed8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundPosition: "right 0.7rem center",
                backgroundSize: "0.85rem",
              }}
            >
              {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{vehicleStatusMeta[s].label}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-ink-700">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-1.5 py-2.5 text-[13px] font-semibold transition sm:px-3 sm:text-sm ${
              tab === key ? "text-brand-700 dark:text-white" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {tab === key && <motion.span layoutId="vd-tab" className="absolute inset-0 rounded-xl bg-white shadow-soft dark:bg-ink-600" />}
            <span className="relative flex min-w-0 items-center gap-1 sm:gap-2">
              <Icon size={16} className="hidden shrink-0 sm:block" />
              <span className="truncate">{label}</span>
              {count ? <span className="shrink-0 rounded-full bg-brand-100 px-1 text-[11px] text-brand-700 dark:bg-ink-500 dark:text-brand-200 sm:px-1.5 sm:text-xs">{count}</span> : null}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "loads" && (
        <SectionCard
          title="Loads"
          subtitle="Trips & profit"
          action={<Button onClick={startLoad} disabled={creatingLoad} icon={creatingLoad ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}>{t("vehicle.newLoad")}</Button>}
        >
          {loads.loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (loads.data ?? []).length === 0 ? (
            <EmptyState icon={<Layers size={24} />} title="No loads yet" description="Create a new load to record rent, diesel, advances and profit." action={<Button onClick={startLoad} icon={<Plus size={16} />}>{t("vehicle.newLoad")}</Button>} />
          ) : (
            <div className="space-y-5">
              {activeLoads.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-status-expiring">Ongoing</p>
                  {activeLoads.map((l, i) => <LoadCard key={l.id} load={l} index={i} />)}
                </div>
              )}
              {pastLoads.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Completed</p>
                  {pastLoads.map((l, i) => <LoadCard key={l.id} load={l} index={i} />)}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {tab === "repairs" && (
        <SectionCard
          title="Repairs"
          subtitle={repairTotal ? `Total ${money(repairTotal)}` : "Maintenance log"}
          action={<Button onClick={() => setRepairOpen(true)} icon={<Plus size={16} />}>{t("vehicle.addRepair")}</Button>}
        >
          {repairs.loading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (repairs.data ?? []).length === 0 ? (
            <EmptyState icon={<Wrench size={24} />} title="No repairs logged" description="Track repair & maintenance costs for this vehicle." action={<Button onClick={() => setRepairOpen(true)} icon={<Plus size={16} />}>{t("vehicle.addRepair")}</Button>} />
          ) : (
            <div className="space-y-2.5">
              {repairs.data!.map((r) => (
                <div key={r.id} className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-ink-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-expired/10 text-status-expired"><Wrench size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{r.description}</p>
                    <p className="text-xs text-slate-400">{fmtDate(r.date)}{r.vendor ? ` · ${r.vendor}` : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{money(r.amount)}</span>
                  <button onClick={async () => { await api.deleteRepair(r.id); repairs.reload(); }} className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-status-expired/10 hover:text-status-expired group-hover:opacity-100"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === "documents" && (
        <SectionCard title="Documents" subtitle="Validity & expiry timeline">
          <div className="space-y-4">
            {v.document_statuses.map((d, i) => {
              const meta = docStatusMeta[d.status];
              return (
                <motion.div key={d.type} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{documentLabels[d.type]}</span>
                      {d.number && <span className="text-xs text-slate-400">· {d.number}</span>}
                    </div>
                    <DocStatusChip status={d.status} size="sm" />
                  </div>
                  <ProgressBar value={d.progress} color={d.status === "unknown" ? "#cbd5e1" : meta.color} />
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><CalendarClock size={11} /> {fmtDate(d.expiry_date)}</span>
                    <span style={{ color: d.status === "valid" ? undefined : meta.color }}>
                      {d.days_to_expiry == null ? "No expiry set" : d.days_to_expiry < 0 ? `Expired ${Math.abs(d.days_to_expiry)}d ago` : `${d.days_to_expiry} days left`}
                    </span>
                  </div>
                  {d.doc_urls && d.doc_urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {d.doc_urls.map((u, idx) => (
                        <a key={idx} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-ink-600 dark:text-brand-200">
                          <FileText size={12} /> Page {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Modals */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Vehicle" maxWidth="max-w-2xl">
        <VehicleForm vehicle={v} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); vehicle.reload(); }} />
      </Modal>

      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete vehicle?" maxWidth="max-w-[400px]">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This permanently removes <strong className="text-slate-800 dark:text-slate-100">{v.registration_number}</strong> and all its loads and repairs.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(false)}>Cancel</Button>
          <Button variant="danger" onClick={remove}>Delete</Button>
        </div>
      </Modal>

      <RepairModal open={repairOpen} vehicleId={id} onClose={() => setRepairOpen(false)} onSaved={() => { setRepairOpen(false); repairs.reload(); }} />
    </div>
  );
}

function RepairModal({ open, vehicleId, onClose, onSaved }: { open: boolean; vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, description: "", amount: "", vendor: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createRepair({ vehicle_id: vehicleId, date: form.date, description: form.description.trim(), amount: Number(form.amount) || 0, vendor: form.vendor.trim() || null });
      setForm({ date: today, description: "", amount: "", vendor: "" });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Repair" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Description"><TextInput required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brake pad replacement" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (₹)"><TextInput type="number" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="8500" /></Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Vendor" className="col-span-2"><TextInput value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Sri Lakshmi Motors" /></Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? <Loader2 size={18} className="animate-spin" /> : "Add repair"}</Button>
        </div>
      </form>
    </Modal>
  );
}
