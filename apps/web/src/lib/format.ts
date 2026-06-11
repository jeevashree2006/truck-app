import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { AxleType, BodyType, DocStatus, DocumentType, TripStatus, VehicleStatus } from "@/types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function money(value?: number | null, precise = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return (precise ? inrPrecise : inr).format(value);
}

export function compactMoney(value?: number | null): string {
  if (value == null) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 10000000) return `${sign}₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `${sign}₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `${sign}₹${(v / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(v)}`;
}

export function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function fmtDate(value?: string | null, pattern = "dd MMM yyyy"): string {
  const d = safeDate(value);
  return d ? format(d, pattern) : "—";
}

export function daysUntil(value?: string | null): number | null {
  const d = safeDate(value);
  return d ? differenceInCalendarDays(d, new Date()) : null;
}

// ---- Status / label maps ----

export const docStatusMeta: Record<DocStatus, { label: string; color: string; bg: string }> = {
  valid: { label: "Valid", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  expiring: { label: "Expiring", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  expired: { label: "Expired", color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  unknown: { label: "No data", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
};

export const documentLabels: Record<DocumentType, string> = {
  ddc: "DDC Form",
  rc: "RC",
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  national_permit: "National Permit",
  road_tax: "Road Tax",
  puc: "PUC",
};

export const vehicleStatusMeta: Record<VehicleStatus, { label: string; color: string; bg: string; dot: string }> = {
  empty: { label: "Empty", color: "#16a34a", bg: "rgba(22,163,74,0.12)", dot: "#16a34a" },
  on_the_way: { label: "On the way", color: "#2563eb", bg: "rgba(37,99,235,0.12)", dot: "#2563eb" },
  waiting_for_unload: { label: "Waiting to unload", color: "#f59e0b", bg: "rgba(245,158,11,0.14)", dot: "#f59e0b" },
  maintenance: { label: "Maintenance", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" },
};

export const tripStatusMeta: Record<TripStatus, { label: string; color: string; bg: string }> = {
  ongoing: { label: "Ongoing", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  completed: { label: "Completed", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  cancelled: { label: "Cancelled", color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
};

export const axleLabels: Record<AxleType, string> = { single: "Single axle", multi: "Multi axle" };
export const bodyLabels: Record<BodyType, string> = {
  open: "Open",
  container: "Container",
  trailer: "Trailer",
  tanker: "Tanker",
  other: "Other",
};

export const spendMeta: Record<string, { label: string; color: string }> = {
  diesel: { label: "Diesel", color: "#8b5cf6" },
  commission: { label: "Commission", color: "#f59e0b" },
  salary: { label: "Driver Salary", color: "#06b6d4" },
  fastag: { label: "FASTag", color: "#ef4444" },
};

export function vehicleTypeSummary(v: { axle_type: AxleType; length_feet?: number | null; body_type: BodyType }): string {
  return [
    axleLabels[v.axle_type],
    v.length_feet ? `${v.length_feet} ft` : null,
    bodyLabels[v.body_type],
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Months elapsed since a "YYYY-MM" manufacture month. */
export function ageInMonths(manufactureMonth?: string | null): number | null {
  if (!manufactureMonth || !/^\d{4}-\d{2}$/.test(manufactureMonth)) return null;
  const [y, m] = manufactureMonth.split("-").map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return months < 0 ? 0 : months;
}

/** Human age from a manufacture month, e.g. "3 yr 4 mo" / "8 mo" / "1 yr". */
export function vehicleAge(manufactureMonth?: string | null): string | null {
  const months = ageInMonths(manufactureMonth);
  if (months == null) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

export function initials(text: string): string {
  const cleaned = text.replace(/[^A-Za-z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
