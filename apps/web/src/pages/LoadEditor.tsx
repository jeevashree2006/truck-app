import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useI18n } from "@/context/I18nContext";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MoneyEntryList } from "@/components/forms/MoneyEntryList";
import { Skeleton } from "@/components/ui/Skeleton";
import { computeLeg, computeTotals, routeSummary, tripMileage } from "@/lib/domain";
import { compactMoney, fmtDate, money } from "@/lib/format";
import type { Leg } from "@/types";

type Tab = "load" | "freight";

const blankLeg = (): Leg => ({
  loading_point: "",
  unloading_point: "",
  total_rent: 0,
  commission: 0,
  driver_salary: 0,
  fastag: [],
  diesel: [],
  advance: [],
  freight_payments: [],
});

export default function LoadEditor() {
  const { loadId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const load = useAsync(() => api.getLoad(loadId), [loadId]);

  const [legs, setLegs] = useState<Leg[]>([]);
  const [tab, setTab] = useState<Tab>("load");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    if (load.data) setLegs(load.data.legs.length ? load.data.legs : [blankLeg()]);
  }, [load.data]);

  const totals = useMemo(() => computeTotals(legs), [legs]);
  const completed = load.data?.status === "completed";

  function patchLeg(i: number, patch: Partial<Leg>) {
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateLoad(loadId, { legs });
      setSavedAt(Date.now());
      load.reload();
      return true;
    } catch (err) {
      setSaveError((err as Error).message || "Couldn't save the load");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (load.loading || !load.data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const vehicleId = load.data.vehicle_id;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/vehicles/${vehicleId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">
          <ArrowLeft size={16} /> Back to vehicle
        </Link>
        <div className="flex items-center gap-2">
          {saveError ? (
            <span className="max-w-[16rem] truncate text-xs font-medium text-status-expired" title={saveError}>⚠ {saveError}</span>
          ) : savedAt ? (
            <span className="text-xs font-medium text-status-valid">Saved ✓</span>
          ) : null}
          <Button variant="ghost" onClick={save} disabled={saving} icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}>
            Save
          </Button>
        </div>
      </div>

      {/* Header summary */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white">
        <div className="absolute inset-0 opacity-25 [background:radial-gradient(360px_160px_at_85%_-20%,#fff,transparent)]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>{load.data.vehicle_registration}</span>
            <span>·</span>
            <span>{completed ? "Completed" : "Ongoing"}</span>
            {load.data.start_date && <><span>·</span><span>{fmtDate(load.data.start_date)}</span></>}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold">{routeSummary(legs) || "New load"}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Total freight" value={money(totals.total_rent)} />
            <Stat label="Spend" value={money(totals.spend)} />
            <Stat label="Profit" value={money(totals.profit)} highlight={totals.profit >= 0 ? "pos" : "neg"} />
            <Stat label="Freight pending" value={totals.freight_fully_paid ? "Paid ✓" : money(totals.freight_pending)} highlight={totals.freight_pending > 0 ? "neg" : "pos"} />
          </div>
        </div>
      </div>

      {completed && (
        <div className="flex items-center gap-3 rounded-2xl bg-status-valid/10 p-4 text-status-valid">
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">
            This trip is closed{load.data.driver_balance != null ? ` · Driver returned ${money(load.data.driver_balance)}` : ""}
            {load.data.mileage != null ? ` · Mileage ${load.data.mileage} km/l` : ""}.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-ink-700">
        {([{ k: "load", label: "Load & costs", icon: Layers }, { k: "freight", label: "Freight payment", icon: Wallet }] as { k: Tab; label: string; icon: typeof Layers }[]).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === k ? "bg-white text-brand-700 shadow-soft dark:bg-ink-600 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
          >
            <Icon size={16} /> {label}
            {k === "freight" && totals.freight_pending > 0 && (
              <span className="rounded-full bg-status-expired/12 px-1.5 py-0.5 text-[11px] font-bold text-status-expired">{compactMoney(totals.freight_pending)} due</span>
            )}
          </button>
        ))}
      </div>

      {tab === "load" && (
      <>
      {/* Legs */}
      <div className="space-y-5">
        {legs.map((leg, i) => {
          const c = computeLeg(leg);
          return (
            <SectionCard
              key={i}
              title={
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-ink-600 dark:text-brand-200">{i + 1}</span>
                  {i === 0 ? "Outbound load" : `Return load ${i}`}
                </span>
              }
              action={
                legs.length > 1 ? (
                  <button onClick={() => removeLeg(i)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-status-expired/10 hover:text-status-expired"><Trash2 size={16} /></button>
                ) : null
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <Field label="Loading point"><TextInput value={leg.loading_point} onChange={(e) => patchLeg(i, { loading_point: e.target.value })} placeholder="Namakkal" /></Field>
                  <div className="hidden pb-3 text-slate-300 sm:block"><ArrowRight size={18} /></div>
                  <Field label="Unloading point"><TextInput value={leg.unloading_point} onChange={(e) => patchLeg(i, { unloading_point: e.target.value })} placeholder="Mumbai" /></Field>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label={t("load.rent")}><TextInput type="number" value={leg.total_rent || ""} onChange={(e) => patchLeg(i, { total_rent: Number(e.target.value) })} placeholder="95000" /></Field>
                  <Field label={t("load.commission")}><TextInput type="number" value={leg.commission || ""} onChange={(e) => patchLeg(i, { commission: Number(e.target.value) })} placeholder="4000" /></Field>
                  <Field label={t("load.salary")}><TextInput type="number" value={leg.driver_salary || ""} onChange={(e) => patchLeg(i, { driver_salary: Number(e.target.value) })} placeholder="8000" /></Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MoneyEntryList label="Diesel" accent="#8b5cf6" entries={leg.diesel} onChange={(d) => patchLeg(i, { diesel: d })} />
                  <MoneyEntryList label="Advance" accent="#06b6d4" entries={leg.advance} onChange={(a) => patchLeg(i, { advance: a })} />
                  <MoneyEntryList label="FASTag / Toll" accent="#f59e0b" entries={leg.fastag} onChange={(f) => patchLeg(i, { fastag: f })} />
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-ink-800">
                  <span className="text-slate-500">Rent <b className="text-slate-800 dark:text-slate-100">{money(leg.total_rent)}</b></span>
                  <span className="text-slate-500">Spend (incl. advance) <b className="text-slate-800 dark:text-slate-100">{money(c.spend)}</b></span>
                  <span className="ml-auto font-bold" style={{ color: (c.profit ?? 0) >= 0 ? "#16a34a" : "#ef4444" }}>Leg profit {money(c.profit)}</span>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <button
        onClick={() => setLegs((prev) => [...prev, blankLeg()])}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 py-4 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-ink-600 dark:hover:bg-ink-700"
      >
        <Plus size={18} /> {t("load.addReturn")} <span className="text-slate-400">(e.g. Mumbai → Madurai)</span>
      </button>

      {/* Trip Settlement: Total rent − Total spend = Total profit */}
      <SectionCard title="Trip Settlement" subtitle="Total rent minus every other cost (commission, salary, FASTag, diesel, advance) = profit.">
        <div className="grid grid-cols-3 gap-4">
          <Summary label="Total rent" value={money(totals.total_rent)} />
          <Summary label="Total spend" value={money(totals.spend)} hint="commission + salary + fastag + diesel + advance" />
          <div className="rounded-xl border border-slate-100 p-3 dark:border-ink-600">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total profit</p>
            <p className="mt-0.5 text-lg font-extrabold" style={{ color: totals.profit >= 0 ? "#16a34a" : "#ef4444" }}>{money(totals.profit)}</p>
          </div>
        </div>
        {/* Spend breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Summary label="Commission" value={money(totals.total_commission)} />
          <Summary label="Driver salary" value={money(totals.total_salary)} />
          <Summary label="FASTag" value={money(totals.total_fastag)} />
          <Summary label="Diesel" value={money(totals.total_diesel)} />
          <Summary label="Advance" value={money(totals.total_advance)} />
        </div>
      </SectionCard>
      </>
      )}

      {/* Freight payment tab — receivables tracked PER LOAD (leg) */}
      {tab === "freight" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-brand-gradient-soft px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            What the transporter / company pays you — <b>per load</b> (advance at loading, balance after unload).
            Trip total received <b className="text-status-valid">{money(totals.freight_received)}</b> · pending{" "}
            <b style={{ color: totals.freight_pending > 0 ? "#ef4444" : "#16a34a" }}>
              {totals.freight_fully_paid ? "Paid ✓" : money(totals.freight_pending)}
            </b>
          </div>

          {legs.map((leg, i) => {
            const c = computeLeg(leg);
            const rent = leg.total_rent || 0;
            const pct = rent ? (c.freight_received || 0) / rent : 0;
            return (
              <SectionCard
                key={i}
                title={
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-ink-600 dark:text-brand-200">{i + 1}</span>
                    {leg.loading_point && leg.unloading_point ? `${leg.loading_point} → ${leg.unloading_point}` : i === 0 ? "Outbound load" : `Return load ${i}`}
                  </span>
                }
                action={
                  c.freight_fully_paid ? (
                    <span className="pill bg-status-valid/12 text-status-valid"><CheckCircle2 size={13} /> Paid</span>
                  ) : (
                    <span className="pill bg-status-expired/12 text-status-expired">{money(c.freight_pending)} due</span>
                  )
                }
              >
                <div className="grid grid-cols-3 gap-3">
                  <Summary label="Freight" value={money(rent)} />
                  <Summary label="Received" value={money(c.freight_received)} />
                  <Summary label="Pending" value={c.freight_fully_paid ? "Paid ✓" : money(c.freight_pending)} />
                </div>
                <div className="mt-3">
                  <ProgressBar value={pct} color="#16a34a" />
                  <p className="mt-1 text-right text-xs text-slate-400">{Math.round(pct * 100)}% collected</p>
                </div>

                <div className="mt-4">
                  <MoneyEntryList
                    label="Payment received"
                    accent="#16a34a"
                    entries={leg.freight_payments}
                    onChange={(fp) => patchLeg(i, { freight_payments: fp })}
                  />
                </div>

                {(c.freight_pending ?? 0) > 0 && (
                  <Button
                    variant="ghost"
                    className="mt-3 w-full"
                    icon={<CheckCircle2 size={16} />}
                    onClick={() => patchLeg(i, { freight_payments: [...leg.freight_payments, { amount: c.freight_pending ?? 0, note: "Balance received" }] })}
                  >
                    Mark balance received ({money(c.freight_pending)})
                  </Button>
                )}
              </SectionCard>
            );
          })}
          <p className="text-xs text-slate-400">Record each payment the transporter gives you for each load, then press <b>Save</b>.</p>
        </div>
      )}

      {/* Action bar */}
      {!completed && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur dark:border-ink-600 dark:bg-ink-800/95">
          <div className="pl-2 text-sm">
            <span className="text-slate-500">Profit</span>{" "}
            <b className="text-lg" style={{ color: totals.profit >= 0 ? "#16a34a" : "#ef4444" }}>{compactMoney(totals.profit)}</b>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}</Button>
            <Button onClick={async () => { if (await save()) setCloseOpen(true); }}>{t("load.closeTrip")}</Button>
          </div>
        </div>
      )}

      <CloseTripModal
        open={closeOpen}
        expectedBalance={totals.expected_driver_balance}
        profit={totals.profit}
        onClose={() => setCloseOpen(false)}
        onConfirm={async (payload) => {
          await api.closeLoad(loadId, payload);
          setCloseOpen(false);
          navigate(`/vehicles/${vehicleId}`);
        }}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "pos" | "neg" }) {
  return (
    <div>
      <p className="text-xs text-white/70">{label}</p>
      <p className={`text-lg font-extrabold ${highlight === "neg" ? "text-rose-200" : highlight === "pos" ? "text-emerald-200" : ""}`}>{value}</p>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-ink-600">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function CloseTripModal({
  open,
  expectedBalance,
  profit,
  onClose,
  onConfirm,
}: {
  open: boolean;
  expectedBalance: number;
  profit: number;
  onClose: () => void;
  onConfirm: (payload: { accounts_image_url?: string | null; driver_balance?: number | null; end_date?: string; start_km?: number | null; end_km?: number | null; fuel_litres?: number | null }) => Promise<void>;
}) {
  const [balance, setBalance] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [fuelL, setFuelL] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) setBalance(String(Math.max(0, Math.round(expectedBalance))));
  }, [open, expectedBalance]);

  const mileage = tripMileage(
    startKm ? Number(startKm) : null,
    endKm ? Number(endKm) : null,
    fuelL ? Number(fuelL) : null,
  );
  const tripKm = startKm && endKm && Number(endKm) > Number(startKm) ? Number(endKm) - Number(startKm) : null;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Modal open={open} onClose={onClose} title="Close this trip?" maxWidth="max-w-md">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Upload the driver's accounts sheet (kanakku sheet), confirm the balance returned, and finalise the profit.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="label">Accounts sheet photo</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-ink-600 dark:hover:bg-ink-700">
            {image ? (
              <img src={image} alt="accounts" className="max-h-32 rounded-lg object-contain" />
            ) : (
              <><ImagePlus size={18} /> Tap to upload "kanakku sheet"</>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>

        <Field label="Balance returned by driver (₹)">
          <TextInput type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>

        <div>
          <label className="label">Odometer & fuel (for mileage)</label>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Start km"><TextInput type="number" inputMode="decimal" placeholder="0" value={startKm} onChange={(e) => setStartKm(e.target.value)} /></Field>
            <Field label="End km"><TextInput type="number" inputMode="decimal" placeholder="0" value={endKm} onChange={(e) => setEndKm(e.target.value)} /></Field>
            <Field label="Fuel (litres)"><TextInput type="number" inputMode="decimal" placeholder="0" value={fuelL} onChange={(e) => setFuelL(e.target.value)} /></Field>
          </div>
          {(tripKm != null || mileage != null) && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-2.5 text-sm dark:bg-ink-800">
              <span className="text-slate-500">{tripKm != null ? `Trip ${tripKm.toLocaleString()} km` : "Mileage"}</span>
              <b className="text-base text-brand-700 dark:text-brand-300">{mileage != null ? `${mileage} km/l` : "—"}</b>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-ink-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Final trip profit</span>
            <b className="text-lg" style={{ color: profit >= 0 ? "#16a34a" : "#ef4444" }}>{money(profit)}</b>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={async () => {
            setConfirming(true);
            try {
              await onConfirm({
                accounts_image_url: image,
                driver_balance: balance ? Number(balance) : null,
                start_km: startKm ? Number(startKm) : null,
                end_km: endKm ? Number(endKm) : null,
                fuel_litres: fuelL ? Number(fuelL) : null,
              });
            } finally {
              setConfirming(false);
            }
          }}
          disabled={confirming}
        >
          {confirming ? <Loader2 size={18} className="animate-spin" /> : "Confirm & close"}
        </Button>
      </div>
    </Modal>
  );
}
