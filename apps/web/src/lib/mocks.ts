// Rich in-memory demo dataset + a tiny store mirroring the API responses.
// Enabled when VITE_USE_MOCKS !== "false". Keeps the app fully demoable offline.

import { computeTotals, enrichVehicle, routeSummary } from "@/lib/domain";
import type {
  DashboardResponse,
  Leg,
  Load,
  MoneyEntry,
  Repair,
  ReminderCard,
  TripProfitRow,
  Vehicle,
  VehicleProfit,
} from "@/types";

const OWNER = "demo-owner";
let seq = 2000;
export const nid = () => `m${seq++}`;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function entry(amount: number, daysAgo: number, note: string): MoneyEntry {
  return { amount, at: isoOffset(-daysAgo), note };
}

function leg(
  from: string,
  to: string,
  rent: number,
  commission: number,
  salary: number,
  fastag: number,
  diesel: MoneyEntry[],
  advance: MoneyEntry[],
  freight_payments: MoneyEntry[] = [],
): Leg {
  return { loading_point: from, unloading_point: to, total_rent: rent, commission: commission ? [{ amount: commission }] : [], driver_salary: salary, fastag: fastag ? [{ amount: fastag }] : [], diesel, advance, freight_payments };
}

interface Store {
  vehicles: Vehicle[];
  loads: Load[];
  repairs: Repair[];
}

function makeVehicle(
  reg: string,
  axle: Vehicle["axle_type"],
  feet: number,
  body: Vehicle["body_type"],
  age: number,
  make: string,
  model: string,
  docs: Record<string, number>,
): Vehicle {
  const documents: Vehicle["documents"] = {};
  Object.keys(docs).forEach((t) => {
    documents[t as keyof Vehicle["documents"]] = {
      number: `${t.toUpperCase()}-${reg.slice(-4)}`,
      issue_date: isoOffset(-365),
      expiry_date: isoOffset(docs[t]),
    };
  });
  return enrichVehicle({
    id: nid(),
    owner_id: OWNER,
    registration_number: reg,
    axle_type: axle,
    length_feet: feet,
    body_type: body,
    manufacture_month: (() => { const d = new Date(); d.setFullYear(d.getFullYear() - age); return d.toISOString().slice(0, 7); })(),
    age_years: age,
    chassis_number: `CHS${reg.slice(-4)}`,
    make,
    model,
    photo_url: null,
    documents,
    status: "empty",
    active_load_id: null,
    document_statuses: [],
    overall_doc_status: "unknown",
    trips_count: 0,
    total_profit: 0,
    created_at: isoOffset(-400),
    updated_at: isoOffset(-2),
  });
}

function buildStore(): Store {
  const vehicles = [
    makeVehicle("TN28AB1234", "multi", 32, "container", 3, "Tata", "LPT 3118", {
      rc: 900, ddc: 300, insurance: 18, fitness: 120, permit: -5, road_tax: 400, puc: 9,
    }),
    makeVehicle("TN29CD5678", "single", 20, "open", 5, "Ashok Leyland", "Ecomet", {
      rc: 1100, ddc: 500, insurance: 210, fitness: 45, permit: 300, road_tax: 60, puc: 170,
    }),
    makeVehicle("TN30EF9012", "multi", 32, "trailer", 2, "BharatBenz", "2823R", {
      rc: 1400, ddc: 700, insurance: 95, fitness: 260, permit: 25, road_tax: 500, puc: -12,
    }),
  ];

  const make = (vIdx: number, status: Load["status"], ds: number, de: number | null, legs: Leg[]): Load => ({
    id: nid(),
    owner_id: OWNER,
    vehicle_id: vehicles[vIdx].id,
    vehicle_registration: vehicles[vIdx].registration_number,
    status,
    start_date: isoOffset(-ds),
    end_date: de == null ? null : isoOffset(-de),
    notes: status === "ongoing" ? "In transit" : null,
    legs,
    accounts_image_url: null,
    driver_balance: status === "completed" ? 5000 : null,
    totals: computeTotals(legs),
    route: routeSummary(legs),
    created_at: isoOffset(-ds),
    closed_at: de == null ? null : isoOffset(-de),
  });

  const loads: Load[] = [
    make(0, "completed", 32, 22, [
      leg("Namakkal", "Mumbai", 95000, 4000, 8000, 2200, [entry(18000, 30, "Fill"), entry(16000, 27, "Fill")], [entry(40000, 31, "Advance")]),
      leg("Mumbai", "Madurai", 88000, 3500, 7500, 1900, [entry(17000, 24, "Fill"), entry(15000, 22, "Fill")], [entry(35000, 25, "Advance")]),
    ]),
    make(1, "completed", 18, 16, [
      leg("Chennai", "Bangalore", 32000, 1500, 3000, 800, [entry(9000, 18, "Fill")], [entry(12000, 19, "Advance")]),
    ]),
    make(2, "completed", 13, 2, [
      leg("Tuticorin", "Delhi", 165000, 7000, 14000, 4200, [entry(30000, 12, "Fill"), entry(28000, 9, "Fill"), entry(26000, 6, "Fill")], [entry(70000, 13, "Advance")]),
      leg("Delhi", "Coimbatore", 158000, 6800, 13500, 4000, [entry(29000, 5, "Fill"), entry(27000, 3, "Fill")], [entry(65000, 6, "Advance")]),
    ]),
    make(0, "completed", 50, 46, [
      leg("Salem", "Hyderabad", 52000, 2200, 5000, 1400, [entry(14000, 48, "Fill")], [entry(20000, 49, "Advance")]),
    ]),
    make(1, "completed", 62, 60, [
      leg("Erode", "Kochi", 28000, 1200, 2800, 700, [entry(8000, 60, "Fill")], [entry(10000, 61, "Advance")]),
    ]),
    make(0, "ongoing", 2, null, [
      leg("Namakkal", "Pune", 78000, 3200, 7000, 1800, [entry(16000, 1, "Fill")], [entry(30000, 2, "Advance")]),
    ]),
  ];

  // Reflect the ongoing load on the vehicle status.
  const ongoing = loads.find((l) => l.status === "ongoing")!;
  const v0 = vehicles.find((v) => v.id === ongoing.vehicle_id)!;
  v0.status = "on_the_way";
  v0.active_load_id = ongoing.id;
  vehicles[1].status = "waiting_for_unload";

  const repairs: Repair[] = [
    { id: nid(), owner_id: OWNER, vehicle_id: vehicles[0].id, vehicle_registration: vehicles[0].registration_number, date: isoOffset(-20), description: "Brake pad + clutch plate replacement", amount: 8500, vendor: "Sri Lakshmi Motors", odometer_km: null },
    { id: nid(), owner_id: OWNER, vehicle_id: vehicles[1].id, vehicle_registration: vehicles[1].registration_number, date: isoOffset(-35), description: "Tyre replacement (2 nos)", amount: 26000, vendor: "MRF Tyres", odometer_km: null },
  ];

  // Lifetime profit/trips per vehicle.
  for (const v of vehicles) {
    const done = loads.filter((l) => l.vehicle_id === v.id && l.status === "completed");
    v.trips_count = done.length;
    v.total_profit = Math.round(done.reduce((a, l) => a + l.totals.profit, 0));
  }

  return { vehicles, loads, repairs };
}

let store = buildStore();
export function resetMocks() {
  seq = 2000;
  store = buildStore();
}
export const mockStore = { get: () => store };

// ---------------- aggregations (mirror backend analytics) ----------------

const monthKey = (d: string) => d.slice(0, 7);
const STATUS_LABELS: Record<string, string> = {
  empty: "Empty", on_the_way: "On the way", waiting_for_unload: "Waiting to unload", maintenance: "Maintenance",
};
const SPEND_LABELS: Record<string, string> = { diesel: "Diesel", commission: "Commission", salary: "Driver Salary", fastag: "FASTag" };

export function mockDashboard(months = 6): DashboardResponse {
  const now = new Date();
  const series: Array<{ key: string; label: string }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[d.getMonth()] });
  }
  const monthly = series.map(({ key, label }) => {
    const inMonth = store.loads.filter((l) => l.status === "completed" && monthKey(l.end_date || l.start_date || "") === key);
    const rent = inMonth.reduce((a, l) => a + l.totals.total_rent, 0);
    const spend = inMonth.reduce((a, l) => a + l.totals.spend, 0);
    return { month: key, label, rent: Math.round(rent), spend: Math.round(spend), profit: Math.round(rent - spend), trips: inMonth.length };
  });

  const completed = store.loads.filter((l) => l.status === "completed");
  const spendTotals = { diesel: 0, commission: 0, salary: 0, fastag: 0 };
  completed.forEach((l) => {
    spendTotals.diesel += l.totals.total_diesel;
    spendTotals.commission += l.totals.total_commission;
    spendTotals.salary += l.totals.total_salary;
    spendTotals.fastag += l.totals.total_fastag;
  });
  const totalSpend = Object.values(spendTotals).reduce((a, b) => a + b, 0) || 1;
  const spend_breakdown = (Object.keys(spendTotals) as Array<keyof typeof spendTotals>)
    .map((cat) => ({ category: cat, label: SPEND_LABELS[cat], amount: Math.round(spendTotals[cat]), percentage: Math.round((spendTotals[cat] / totalSpend) * 1000) / 10 }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const statusCounts = new Map<string, number>();
  store.vehicles.forEach((v) => statusCounts.set(v.status, (statusCounts.get(v.status) ?? 0) + 1));
  const status_breakdown = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, label: STATUS_LABELS[status] ?? status, count }));

  const top_vehicles = vehicleProfitList().filter((v) => v.trips_count > 0).slice(0, 6);

  const thisMonth = series[series.length - 1].key;
  const cur = monthly.find((m) => m.month === thisMonth)!;
  const docsExpiring = store.vehicles.reduce(
    (a, v) => a + v.document_statuses.filter((d) => d.status === "expiring" || d.status === "expired").length,
    0,
  );

  return {
    kpis: {
      total_vehicles: store.vehicles.length,
      vehicles_on_way: store.vehicles.filter((v) => v.status === "on_the_way").length,
      vehicles_empty: store.vehicles.filter((v) => v.status === "empty").length,
      vehicles_waiting: store.vehicles.filter((v) => v.status === "waiting_for_unload").length,
      active_loads: store.loads.filter((l) => l.status === "ongoing").length,
      trips_this_month: cur.trips,
      rent_this_month: cur.rent,
      spend_this_month: cur.spend,
      profit_this_month: cur.profit,
      profit_all_time: Math.round(completed.reduce((a, l) => a + l.totals.profit, 0)),
      documents_expiring: docsExpiring,
    },
    monthly,
    spend_breakdown,
    status_breakdown,
    top_vehicles,
  };
}

export function vehicleProfitList(): VehicleProfit[] {
  return store.vehicles
    .map((v) => {
      const done = store.loads.filter((l) => l.vehicle_id === v.id && l.status === "completed");
      const total_rent = done.reduce((a, l) => a + l.totals.total_rent, 0);
      const total_spend = done.reduce((a, l) => a + l.totals.spend, 0);
      const total_profit = total_rent - total_spend;
      return {
        vehicle_id: v.id,
        registration_number: v.registration_number,
        body_type: v.body_type,
        status: v.status,
        trips_count: done.length,
        total_rent: Math.round(total_rent),
        total_spend: Math.round(total_spend),
        total_profit: Math.round(total_profit),
        avg_profit: done.length ? Math.round(total_profit / done.length) : 0,
      };
    })
    .sort((a, b) => b.total_profit - a.total_profit);
}

export function tripsForVehicle(vehicleId: string): TripProfitRow[] {
  return store.loads
    .filter((l) => l.vehicle_id === vehicleId)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .map((l) => ({
      load_id: l.id,
      route: l.route || "—",
      status: l.status,
      start_date: l.start_date ?? null,
      end_date: l.end_date ?? null,
      rent: l.totals.total_rent,
      spend: l.totals.spend,
      profit: l.totals.profit,
    }));
}

export function mockReminders(): ReminderCard[] {
  const DOC_LABEL: Record<string, string> = {
    ddc: "DDC Form", rc: "RC", insurance: "Insurance", fitness: "Fitness Certificate",
    permit: "Permit", national_permit: "National Permit", road_tax: "Road Tax", puc: "PUC",
  };
  const out: ReminderCard[] = [];
  for (const v of store.vehicles) {
    for (const d of v.document_statuses) {
      if (d.status === "expired" || d.status === "expiring") {
        const label = DOC_LABEL[d.type] ?? d.type;
        out.push({
          type: "document_expiry",
          title: d.status === "expired" ? `${label} expired — ${v.registration_number}` : `${label} expiring soon — ${v.registration_number}`,
          body:
            d.status === "expired"
              ? `The ${label} for ${v.registration_number} expired ${Math.abs(d.days_to_expiry ?? 0)} day(s) ago. Renew immediately.`
              : `The ${label} for ${v.registration_number} expires in ${d.days_to_expiry} day(s).`,
          vehicle_id: v.id,
          severity: d.status === "expired" ? "high" : "medium",
          days: d.days_to_expiry,
        });
      }
    }
  }
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.days ?? 9999) - (b.days ?? 9999));
}
