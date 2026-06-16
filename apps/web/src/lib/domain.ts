// Client-side mirror of the backend's status + profit math. Used by the mock data
// layer so the demo renders identical figures to the live API.

import { differenceInCalendarDays, parseISO } from "date-fns";
import { EXPIRING_SOON_DAYS } from "@/lib/constants";
import type { DocStatus, DocumentType, Leg, Load, LoadTotals, Vehicle } from "@/types";

const DOC_TYPES: DocumentType[] = ["ddc", "rc", "insurance", "fitness", "permit", "national_permit", "road_tax", "puc"];
const STATUS_RANK: Record<DocStatus, number> = { expired: 3, expiring: 2, valid: 1, unknown: 0 };

function days(value?: string | null): number | null {
  if (!value) return null;
  try {
    return differenceInCalendarDays(parseISO(value), new Date());
  } catch {
    return null;
  }
}

export function computeDocStatus(
  expiry?: string | null,
  issue?: string | null,
): { status: DocStatus; days_to_expiry: number | null; progress: number | null } {
  if (!expiry) return { status: "unknown", days_to_expiry: null, progress: null };
  const dte = days(expiry)!;
  let status: DocStatus = "valid";
  if (dte < 0) status = "expired";
  else if (dte <= EXPIRING_SOON_DAYS) status = "expiring";

  let progress: number;
  const issueDays = days(issue);
  if (issue && issueDays != null) {
    const span = dte - issueDays;
    const elapsed = -issueDays;
    progress = span > 0 ? Math.max(0, Math.min(1, elapsed / span)) : 1;
  } else if (dte >= EXPIRING_SOON_DAYS) progress = 0;
  else if (dte < 0) progress = 1;
  else progress = 1 - dte / EXPIRING_SOON_DAYS;

  return { status, days_to_expiry: dte, progress: Math.round(progress * 1000) / 1000 };
}

export function enrichVehicle(v: Vehicle): Vehicle {
  const statuses = DOC_TYPES.map((type) => {
    const info = v.documents?.[type] ?? {};
    const computed = computeDocStatus(info.expiry_date, info.issue_date);
    return {
      type,
      number: info.number ?? null,
      issue_date: info.issue_date ?? null,
      expiry_date: info.expiry_date ?? null,
      doc_urls: info.doc_urls ?? (info.doc_url ? [info.doc_url] : []),
      status: computed.status,
      days_to_expiry: computed.days_to_expiry,
      progress: computed.progress,
    };
  });
  let overall: DocStatus = "unknown";
  for (const s of statuses) {
    if (s.expiry_date && STATUS_RANK[s.status] > STATUS_RANK[overall]) overall = s.status;
  }
  return { ...v, document_statuses: statuses, overall_doc_status: overall };
}

const sumEntries = (entries?: { amount: number }[]) => (entries ?? []).reduce((a, e) => a + (e.amount || 0), 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeLeg(leg: Leg): Leg {
  const diesel_total = sumEntries(leg.diesel);
  const advance_total = sumEntries(leg.advance);
  // Spend = every cost except the rent (diesel + commission + salary + fastag + advance).
  const spend = diesel_total + (leg.commission || 0) + (leg.driver_salary || 0) + (leg.fastag || 0) + advance_total;
  const rent = leg.total_rent || 0;
  const freight_received = sumEntries(leg.freight_payments);
  return {
    ...leg,
    diesel_total: r2(diesel_total),
    advance_total: r2(advance_total),
    spend: r2(spend),
    profit: r2(rent - spend),
    freight_received: r2(freight_received),
    freight_pending: r2(Math.max(0, rent - freight_received)),
    freight_fully_paid: rent > 0 && freight_received >= rent - 0.01,
  };
}

export function computeTotals(legs: Leg[]): LoadTotals {
  const computed = legs.map(computeLeg);
  const total_rent = computed.reduce((a, l) => a + (l.total_rent || 0), 0);
  const total_diesel = computed.reduce((a, l) => a + (l.diesel_total || 0), 0);
  const total_commission = computed.reduce((a, l) => a + (l.commission || 0), 0);
  const total_salary = computed.reduce((a, l) => a + (l.driver_salary || 0), 0);
  const total_fastag = computed.reduce((a, l) => a + (l.fastag || 0), 0);
  const total_advance = computed.reduce((a, l) => a + (l.advance_total || 0), 0);
  const spend = total_diesel + total_commission + total_salary + total_fastag + total_advance;
  const freight_received = computed.reduce((a, l) => a + (l.freight_received || 0), 0);
  const freight_pending = computed.reduce((a, l) => a + (l.freight_pending || 0), 0);
  return {
    total_rent: r2(total_rent),
    total_diesel: r2(total_diesel),
    total_commission: r2(total_commission),
    total_salary: r2(total_salary),
    total_fastag: r2(total_fastag),
    total_advance: r2(total_advance),
    spend: r2(spend),
    profit: r2(total_rent - spend),
    leg_count: computed.length,
    expected_driver_balance: r2(Math.max(0, total_advance - (total_diesel + total_fastag))),
    freight_received: r2(freight_received),
    freight_pending: r2(freight_pending),
    // Per-leg freight: fully paid only when no leg is still owed (overpaying one leg
    // must not cancel another leg's shortfall).
    freight_fully_paid: total_rent > 0 && freight_pending <= 0.01,
  };
}

export function routeSummary(legs: Leg[]): string {
  const points: string[] = [];
  for (const leg of legs) {
    const a = (leg.loading_point || "").trim();
    const b = (leg.unloading_point || "").trim();
    if (a && points[points.length - 1] !== a) points.push(a);
    if (b && points[points.length - 1] !== b) points.push(b);
  }
  return points.join(" → ");
}

/** Trip mileage in km/litre = (end_km - start_km) / fuel_litres, when all are valid. */
export function tripMileage(
  startKm?: number | null,
  endKm?: number | null,
  fuelLitres?: number | null,
): number | null {
  if (startKm == null || endKm == null || fuelLitres == null) return null;
  if (fuelLitres <= 0 || endKm <= startKm) return null;
  return r2((endKm - startKm) / fuelLitres);
}

export function enrichLoad(load: Load): Load {
  return {
    ...load,
    legs: load.legs.map(computeLeg),
    totals: computeTotals(load.legs),
    route: routeSummary(load.legs),
    mileage: tripMileage(load.start_km, load.end_km, load.fuel_litres),
  };
}
