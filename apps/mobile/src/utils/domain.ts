/** Profit + document-status math and label maps (mirror of the web/backend logic). */

import { clamp01, daysUntil } from '@/utils/format';
import type {
  AxleType,
  BodyType,
  DocStatus,
  DocType,
  Leg,
  LoadTotals,
  TripStatus,
  Vehicle,
  VehicleStatus,
} from '@/types';

const DOC_TYPES: DocType[] = ['ddc', 'rc', 'insurance', 'fitness', 'permit', 'national_permit', 'road_tax', 'puc'];
const RANK: Record<DocStatus, number> = { expired: 3, expiring: 2, valid: 1, unknown: 0 };

export function enrichVehicle(v: Vehicle): Vehicle {
  const statuses = DOC_TYPES.map((type) => {
    const info = v.documents?.[type] ?? {};
    const days = daysUntil(info.expiry_date);
    let status: DocStatus = 'unknown';
    if (days !== null) status = days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'valid';
    let progress: number | null = null;
    if (info.issue_date && info.expiry_date) {
      const start = new Date(info.issue_date).getTime();
      const end = new Date(info.expiry_date).getTime();
      if (end > start) progress = clamp01((Date.now() - start) / (end - start));
    } else if (days !== null) {
      progress = days >= 30 ? 0 : days < 0 ? 1 : 1 - days / 30;
    }
    return {
      type,
      number: info.number ?? null,
      issue_date: info.issue_date ?? null,
      expiry_date: info.expiry_date ?? null,
      status,
      days_to_expiry: days,
      progress,
    };
  });
  let overall: DocStatus = 'unknown';
  for (const s of statuses) if (s.expiry_date && RANK[s.status] > RANK[overall]) overall = s.status;
  return { ...v, document_statuses: statuses, overall_doc_status: overall };
}

const sum = (entries?: { amount: number }[]) => (entries ?? []).reduce((a, e) => a + (Number(e.amount) || 0), 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeLeg(leg: Leg): Leg {
  const diesel_total = sum(leg.diesel);
  const advance_total = sum(leg.advance);
  const spend = diesel_total + (leg.commission || 0) + (leg.driver_salary || 0) + (leg.fastag || 0);
  return {
    ...leg,
    diesel_total: r2(diesel_total),
    advance_total: r2(advance_total),
    spend: r2(spend),
    profit: r2((leg.total_rent || 0) - spend),
  };
}

export function computeTotals(legs: Leg[]): LoadTotals {
  const c = legs.map(computeLeg);
  const total_rent = c.reduce((a, l) => a + (l.total_rent || 0), 0);
  const total_diesel = c.reduce((a, l) => a + (l.diesel_total || 0), 0);
  const total_commission = c.reduce((a, l) => a + (l.commission || 0), 0);
  const total_salary = c.reduce((a, l) => a + (l.driver_salary || 0), 0);
  const total_fastag = c.reduce((a, l) => a + (l.fastag || 0), 0);
  const total_advance = c.reduce((a, l) => a + (l.advance_total || 0), 0);
  const spend = total_diesel + total_commission + total_salary + total_fastag;
  return {
    total_rent: r2(total_rent),
    total_diesel: r2(total_diesel),
    total_commission: r2(total_commission),
    total_salary: r2(total_salary),
    total_fastag: r2(total_fastag),
    total_advance: r2(total_advance),
    spend: r2(spend),
    profit: r2(total_rent - spend),
    leg_count: c.length,
    expected_driver_balance: r2(Math.max(0, total_advance - (total_diesel + total_fastag))),
  };
}

export function routeSummary(legs: Leg[]): string {
  const points: string[] = [];
  for (const leg of legs) {
    const a = (leg.loading_point || '').trim();
    const b = (leg.unloading_point || '').trim();
    if (a && points[points.length - 1] !== a) points.push(a);
    if (b && points[points.length - 1] !== b) points.push(b);
  }
  return points.join(' → ');
}

// ---- Label maps ----

export const documentLabels: Record<DocType, string> = {
  ddc: 'DDC Form',
  rc: 'RC',
  insurance: 'Insurance',
  fitness: 'Fitness',
  permit: 'Permit',
  national_permit: 'National Permit',
  road_tax: 'Road Tax',
  puc: 'PUC',
};

export const axleLabels: Record<AxleType, string> = { single: 'Single axle', multi: 'Multi axle' };
export const bodyLabels: Record<BodyType, string> = {
  open: 'Open',
  container: 'Container',
  trailer: 'Trailer',
  tanker: 'Tanker',
  other: 'Other',
};

export const vehicleStatusMeta: Record<VehicleStatus, { label: string; color: string }> = {
  empty: { label: 'Empty', color: '#16a34a' },
  on_the_way: { label: 'On the way', color: '#2563eb' },
  waiting_for_unload: { label: 'Waiting to unload', color: '#f59e0b' },
  maintenance: { label: 'Maintenance', color: '#ef4444' },
};

export const tripStatusMeta: Record<TripStatus, { label: string; color: string }> = {
  ongoing: { label: 'Ongoing', color: '#f59e0b' },
  completed: { label: 'Completed', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#94a3b8' },
};

export const spendColors: Record<string, string> = {
  diesel: '#8b5cf6',
  commission: '#f59e0b',
  salary: '#06b6d4',
  fastag: '#ef4444',
};

export const AXLE_TYPES: AxleType[] = ['single', 'multi'];
export const BODY_TYPES: BodyType[] = ['open', 'container', 'trailer', 'tanker', 'other'];
export const VEHICLE_STATUSES: VehicleStatus[] = ['empty', 'on_the_way', 'waiting_for_unload', 'maintenance'];
export const COMMON_LENGTHS_FEET = [14, 17, 19, 20, 22, 24, 32, 40];

export function vehicleTypeSummary(v: { axle_type: AxleType; length_feet?: number | null; body_type: BodyType }): string {
  return [axleLabels[v.axle_type], v.length_feet ? `${v.length_feet} ft` : null, bodyLabels[v.body_type]]
    .filter(Boolean)
    .join(' · ');
}
