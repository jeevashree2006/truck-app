import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AxleType, BodyType, DocumentType, Vehicle } from "@/types";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { DocUpload } from "@/components/forms/DocUpload";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { AXLE_TYPES, BODY_TYPES, COMMON_LENGTHS_FEET, DOCUMENT_TYPES } from "@/lib/constants";
import { ageInMonths, axleLabels, bodyLabels, documentLabels, vehicleAge } from "@/lib/format";

interface Props {
  vehicle?: Vehicle;
  onSaved: (v: Vehicle) => void;
  onCancel: () => void;
}

const MONTH_OPTIONS = [
  { value: "", label: "Month" },
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(
    (m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }),
  ),
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Year" },
  ...Array.from({ length: 31 }, (_, i) => String(CURRENT_YEAR - i)).map((y) => ({ value: y, label: y })),
];
const MODEL_OPTIONS = [
  { value: "", label: "Select model" },
  { value: "BS3", label: "BS3" },
  { value: "BS4", label: "BS4" },
  { value: "BS6", label: "BS6" },
];

export function VehicleForm({ vehicle, onSaved, onCancel }: Props) {
  const [mfgYear, mfgMonthInit] = (vehicle?.manufacture_month ?? "").split("-");
  const [form, setForm] = useState({
    registration_number: vehicle?.registration_number ?? "",
    axle_type: vehicle?.axle_type ?? ("multi" as AxleType),
    length_feet: vehicle?.length_feet?.toString() ?? "32",
    body_type: vehicle?.body_type ?? ("container" as BodyType),
    mfg_year: mfgYear ?? "",
    mfg_month: mfgMonthInit ?? "",
    chassis_number: vehicle?.chassis_number ?? "",
    model: vehicle?.model ?? "",
  });
  const [docs, setDocs] = useState<Record<string, { doc_urls: string[]; issue_date: string; expiry_date: string }>>(() => {
    const init: Record<string, { doc_urls: string[]; issue_date: string; expiry_date: string }> = {};
    DOCUMENT_TYPES.forEach((d) => {
      const info = vehicle?.documents?.[d];
      const urls = info?.doc_urls ?? (info?.doc_url ? [info.doc_url] : []);
      init[d] = { doc_urls: urls, issue_date: info?.issue_date ?? "", expiry_date: info?.expiry_date ?? "" };
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const manufactureMonth = form.mfg_year && form.mfg_month ? `${form.mfg_year}-${form.mfg_month}` : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const documents: Vehicle["documents"] = {};
      (Object.keys(docs) as DocumentType[]).forEach((d) => {
        const v = docs[d];
        if (v.doc_urls.length || v.issue_date || v.expiry_date) {
          documents[d] = { doc_urls: v.doc_urls, issue_date: v.issue_date || null, expiry_date: v.expiry_date || null };
        }
      });
      const payload: Partial<Vehicle> = {
        registration_number: form.registration_number.trim().toUpperCase(),
        axle_type: form.axle_type,
        length_feet: form.length_feet ? Number(form.length_feet) : null,
        body_type: form.body_type,
        manufacture_month: manufactureMonth || null,
        // Derive whole-year age from the manufacture month (for reports etc.).
        age_years: manufactureMonth ? Math.floor((ageInMonths(manufactureMonth) ?? 0) / 12) : null,
        chassis_number: form.chassis_number.trim() || null,
        model: form.model || null,
        documents,
      };
      const saved = vehicle ? await api.updateVehicle(vehicle.id, payload) : await api.createVehicle(payload);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vehicle Number" className="sm:col-span-2">
          <TextInput required value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} placeholder="TN28AB1234" />
        </Field>
        <Field label="Axle">
          <Select value={form.axle_type} onChange={(e) => set("axle_type", e.target.value)} options={AXLE_TYPES.map((a) => ({ value: a, label: axleLabels[a] }))} />
        </Field>
        <Field label="Length (feet)">
          <Select
            value={form.length_feet}
            onChange={(e) => set("length_feet", e.target.value)}
            options={COMMON_LENGTHS_FEET.map((f) => ({ value: String(f), label: `${f} ft` }))}
          />
        </Field>
        <Field label="Body type">
          <Select value={form.body_type} onChange={(e) => set("body_type", e.target.value)} options={BODY_TYPES.map((b) => ({ value: b, label: bodyLabels[b] }))} />
        </Field>
        <Field label="Model (emission norm)">
          <Select value={form.model} onChange={(e) => set("model", e.target.value)} options={MODEL_OPTIONS} />
        </Field>
        <Field label="Manufactured — month & year" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.mfg_month} onChange={(e) => set("mfg_month", e.target.value)} options={MONTH_OPTIONS} />
            <Select value={form.mfg_year} onChange={(e) => set("mfg_year", e.target.value)} options={YEAR_OPTIONS} />
          </div>
          {manufactureMonth && (
            <p className="mt-1.5 text-xs font-semibold text-brand-600">Vehicle age: {vehicleAge(manufactureMonth)}</p>
          )}
        </Field>
        <Field label="Chassis Number" className="sm:col-span-2">
          <TextInput value={form.chassis_number} onChange={(e) => set("chassis_number", e.target.value)} placeholder="MAT4827..." />
        </Field>
      </div>

      <div>
        <p className="label">Documents — upload a photo/PDF & set the expiry</p>
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((d) => (
            <div key={d} className="rounded-xl border border-slate-100 p-3 dark:border-ink-600">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{documentLabels[d]}</span>
                {docs[d].doc_urls.length > 0 && (
                  <span className="pill bg-status-valid/12 text-status-valid">{docs[d].doc_urls.length} page{docs[d].doc_urls.length > 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Issue date</span>
                  <TextInput type="date" value={docs[d].issue_date} onChange={(e) => setDocs((p) => ({ ...p, [d]: { ...p[d], issue_date: e.target.value } }))} />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Expiry date</span>
                  <TextInput type="date" value={docs[d].expiry_date} onChange={(e) => setDocs((p) => ({ ...p, [d]: { ...p[d], expiry_date: e.target.value } }))} />
                </div>
              </div>
              <div className="mt-2.5">
                <DocUpload urls={docs[d].doc_urls} onChange={(urls) => setDocs((p) => ({ ...p, [d]: { ...p[d], doc_urls: urls } }))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-status-expired">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : vehicle ? "Save changes" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
