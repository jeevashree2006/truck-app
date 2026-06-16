import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee, Pencil, Phone, Plus, Search, Star, Truck, UserRound, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { FAB } from "@/components/ui/FAB";
import { initials, money } from "@/lib/format";
import { fileToDataUrl } from "@/lib/files";
import { cn } from "@/lib/cn";
import type { Driver, DriverMobile, Vehicle } from "@/types";

type Tab = "overall" | "live" | "advance";

export default function Drivers() {
  const drivers = useAsync(() => api.listDrivers(), []);
  const vehicles = useAsync(() => api.listVehicles(), []);
  const [tab, setTab] = useState<Tab>("overall");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [assigning, setAssigning] = useState<Driver | null>(null);
  const [advanceFor, setAdvanceFor] = useState<Driver | null>(null);

  const list = drivers.data ?? [];
  const live = list.filter((d) => d.status === "active");
  const withAdvance = list.filter((d) => (d.advance_amount || 0) > 0).sort((a, b) => b.advance_amount - a.advance_amount);
  const overall = list.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || (d.primary_mobile || "").includes(query));

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "overall", label: "Overall", count: list.length },
    { key: "live", label: "Live drivers", count: live.length },
    { key: "advance", label: "Advance", count: withAdvance.length },
  ];

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(d: Driver) { setEditing(d); setFormOpen(true); }
  function reload() { drivers.reload(); }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {tab === "overall" ? (
          <div className="relative max-w-xs flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drivers..." className="input pl-10" />
          </div>
        ) : <div />}
        <Button onClick={openAdd} icon={<Plus size={18} />} className="hidden sm:inline-flex">Add driver</Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-ink-700">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-semibold transition sm:text-sm",
              tab === key ? "text-brand-700 dark:text-white" : "text-slate-500 dark:text-slate-400",
            )}
          >
            {tab === key && <motion.span layoutId="drv-tab" className="absolute inset-0 rounded-xl bg-white shadow-soft dark:bg-ink-600" />}
            <span className="relative truncate">{label}</span>
            {count > 0 && <span className="relative shrink-0 rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-700 dark:bg-ink-500 dark:text-brand-200">{count}</span>}
          </button>
        ))}
      </div>

      {drivers.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : tab === "overall" ? (
        overall.length === 0 ? (
          <EmptyState icon={<UserRound size={26} />} title={query ? "No matches" : "No drivers yet"} description={query ? "Try another search." : "Add your drivers to track who's on the road and any advances."} action={!query && <Button onClick={openAdd} icon={<Plus size={18} />}>Add driver</Button>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overall.map((d, i) => <DriverCard key={d.id} driver={d} index={i} onEdit={() => openEdit(d)} onAssign={() => setAssigning(d)} />)}
          </div>
        )
      ) : tab === "live" ? (
        live.length === 0 ? (
          <EmptyState icon={<Truck size={26} />} title="No live drivers" description="Assign a driver to a vehicle (tap a driver's status) to mark them on a trip." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((d, i) => <DriverCard key={d.id} driver={d} index={i} live onAssign={() => setAssigning(d)} />)}
          </div>
        )
      ) : (
        // Advance tab
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding advances, highest first. Edit to reduce as the driver repays.</p>
            <Button variant="ghost" onClick={() => setAdvanceFor(list[0] ?? null)} icon={<Plus size={16} />} disabled={list.length === 0}>Add advance</Button>
          </div>
          {withAdvance.length === 0 ? (
            <EmptyState icon={<IndianRupee size={26} />} title="No advances" description="Record an advance given to a driver; it'll appear here, ordered by amount." />
          ) : (
            withAdvance.map((d) => (
              <div key={d.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-ink-600 dark:bg-ink-700">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white">{initials(d.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-slate-100">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.primary_mobile}{d.assigned_vehicle_registration ? ` · ${d.assigned_vehicle_registration}` : ""}</p>
                </div>
                <span className="text-lg font-extrabold text-status-expired">{money(d.advance_amount)}</span>
                <button onClick={() => setAdvanceFor(d)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-ink-600" title="Edit amount"><Pencil size={16} /></button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit driver" : "Add driver"} maxWidth="max-w-lg">
        <DriverForm driver={editing} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); reload(); }} />
      </Modal>

      <AssignModal driver={assigning} vehicles={vehicles.data ?? []} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); reload(); }} />
      <AdvanceModal driver={advanceFor} drivers={list} onClose={() => setAdvanceFor(null)} onSaved={() => { setAdvanceFor(null); reload(); }} />

      <div className="sm:hidden"><FAB onClick={openAdd} label="Add driver" /></div>
    </div>
  );
}

function DriverCard({ driver, index = 0, live, onEdit, onAssign }: { driver: Driver; index?: number; live?: boolean; onEdit?: () => void; onAssign?: () => void }) {
  const isActive = driver.status === "active";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }}
      className="card flex flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-base font-bold text-white">{initials(driver.name)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900 dark:text-slate-100">{driver.name}</p>
          <p className="truncate text-xs text-slate-400">{driver.primary_mobile || "No number"}{driver.mobiles && driver.mobiles.length > 1 ? ` +${driver.mobiles.length - 1}` : ""}</p>
        </div>
        {driver.primary_mobile && (
          <a href={`tel:${driver.primary_mobile}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-valid/12 text-status-valid transition hover:bg-status-valid/20" title={`Call ${driver.primary_mobile}`} aria-label="Call driver">
            <Phone size={18} />
          </a>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onAssign}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition",
            isActive ? "bg-status-valid/12 text-status-valid hover:bg-status-valid/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-ink-600 dark:text-slate-300",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-status-valid" : "bg-slate-400")} />
          {isActive ? `On trip · ${driver.assigned_vehicle_registration ?? "vehicle"}` : "Inactive"}
        </button>
        {!live && onEdit && (
          <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-ink-600" title="Edit driver"><Pencil size={16} /></button>
        )}
      </div>
    </motion.div>
  );
}

function emptyMobile(primary = false): DriverMobile { return { number: "", primary }; }

function DriverForm({ driver, onCancel, onSaved }: { driver: Driver | null; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(driver?.name ?? "");
  const [mobiles, setMobiles] = useState<DriverMobile[]>(driver?.mobiles?.length ? driver.mobiles : [emptyMobile(true)]);
  const [licence, setLicence] = useState(driver?.licence_number ?? "");
  const [licenceImg, setLicenceImg] = useState<string | null>(driver?.licence_image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  function setMobile(i: number, patch: Partial<DriverMobile>) {
    setMobiles((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function makePrimary(i: number) {
    setMobiles((prev) => prev.map((m, idx) => ({ ...m, primary: idx === i })));
  }
  function addMobile() { setMobiles((prev) => [...prev, emptyMobile(prev.length === 0)]); }
  function removeMobile(i: number) {
    setMobiles((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length && !next.some((m) => m.primary)) next[0].primary = true;
      return next.length ? next : [emptyMobile(true)];
    });
  }

  async function onLicenceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setLicenceImg(await fileToDataUrl(f));
  }

  async function submit() {
    if (savingRef.current) return; // beat the double-click race (drivers have no server-side dedup)
    const cleanMobiles = mobiles.filter((m) => m.number.trim()).map((m) => ({ number: m.number.trim(), primary: m.primary }));
    if (!name.trim()) { setError("Driver name is required"); return; }
    if (cleanMobiles.length && !cleanMobiles.some((m) => m.primary)) cleanMobiles[0].primary = true;
    savingRef.current = true;
    setSaving(true); setError(null);
    try {
      const payload = { name: name.trim(), mobiles: cleanMobiles, licence_number: licence.trim() || null, licence_image_url: licenceImg };
      if (driver) await api.updateDriver(driver.id, payload);
      else await api.createDriver(payload);
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Driver name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Murugan" /></Field>

      <div>
        <label className="label">Mobile numbers · tap ★ to set the primary (the one calls go to)</label>
        <div className="space-y-2">
          {mobiles.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <button type="button" onClick={() => makePrimary(i)} title={m.primary ? "Primary number" : "Set as primary"} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition", m.primary ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-300 hover:text-amber-400 dark:bg-ink-600")}>
                <Star size={16} fill={m.primary ? "currentColor" : "none"} />
              </button>
              <TextInput value={m.number} onChange={(e) => setMobile(i, { number: e.target.value })} placeholder="9876543210" inputMode="tel" />
              {mobiles.length > 1 && <button type="button" onClick={() => removeMobile(i)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-status-expired"><X size={16} /></button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={addMobile} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><Plus size={15} /> Add mobile number</button>
      </div>

      <Field label="Licence number (optional)"><TextInput value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="TN37 20230001234" /></Field>

      <div>
        <label className="label">Licence photo (optional)</label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-ink-600 dark:hover:bg-ink-700">
          {licenceImg ? <img src={licenceImg} alt="licence" className="max-h-28 rounded-lg object-contain" /> : <><Plus size={16} /> Upload licence image</>}
          <input type="file" accept="image/*" className="hidden" onChange={onLicenceFile} />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-status-expired">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : driver ? "Save changes" : "Add driver"}</Button>
      </div>
    </div>
  );
}

function AssignModal({ driver, vehicles, onClose, onSaved }: { driver: Driver | null; vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const [vehicleId, setVehicleId] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVehicleId(driver?.assigned_vehicle_id ?? ""); }, [driver]);

  async function submit() {
    if (!driver) return;
    setSaving(true);
    try { await api.assignDriverVehicle(driver.id, vehicleId || null); onSaved(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={!!driver} onClose={onClose} title={`${driver?.name ?? "Driver"} — status`} maxWidth="max-w-md">
      <p className="text-sm text-slate-500 dark:text-slate-400">Put the driver on a vehicle (→ on trip / live), or choose "Leaving vehicle" to set them inactive.</p>
      <div className="mt-4">
        <Field label="Vehicle">
          <Select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={[{ value: "", label: "Leaving vehicle (set inactive)" }, ...vehicles.map((v) => ({ value: v.id, label: v.registration_number }))]}
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : vehicleId ? "Put on trip" : "Set inactive"}</Button>
      </div>
    </Modal>
  );
}

function AdvanceModal({ driver, drivers, onClose, onSaved }: { driver: Driver | null; drivers: Driver[]; onClose: () => void; onSaved: () => void }) {
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (driver) { setDriverId(driver.id); setAmount(driver.advance_amount ? String(driver.advance_amount) : ""); }
  }, [driver]);
  const selected = useMemo(() => drivers.find((d) => d.id === driverId), [drivers, driverId]);

  async function submit() {
    if (!driverId) return;
    setSaving(true);
    try { await api.setDriverAdvance(driverId, amount ? Number(amount) : 0); onSaved(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={!!driver} onClose={onClose} title="Driver advance" maxWidth="max-w-md">
      <div className="space-y-4">
        <Field label="Driver">
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} options={drivers.map((d) => ({ value: d.id, label: d.name }))} />
        </Field>
        <Field label="Advance amount (₹) — reduce as the driver repays">
          <TextInput type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        {selected && selected.advance_amount > 0 && <p className="text-xs text-slate-400">Current advance: {money(selected.advance_amount)}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !driverId}>{saving ? "Saving…" : "Save advance"}</Button>
      </div>
    </Modal>
  );
}
