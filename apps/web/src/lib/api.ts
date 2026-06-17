import { computeTotals, enrichVehicle, routeSummary, tripMileage } from "@/lib/domain";
import {
  mockDashboard,
  mockReminders,
  mockStore,
  nid,
  resetMocks,
  tripsForVehicle,
  vehicleProfitList,
} from "@/lib/mocks";
import type {
  DashboardResponse,
  Driver,
  Leg,
  Load,
  Repair,
  ReminderCard,
  TokenPair,
  TripProfitRow,
  User,
  Vehicle,
  VehicleProfit,
  VehicleStatus,
} from "@/types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

const TOKEN_KEY = "fleet.access";
const REFRESH_KEY = "fleet.refresh";

export const tokenStore = {
  access: () => localStorage.getItem(TOKEN_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  set: (t: TokenPair) => {
    localStorage.setItem(TOKEN_KEY, t.access_token);
    localStorage.setItem(REFRESH_KEY, t.refresh_token);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Turn a FastAPI error body into a readable string. `detail` may be a string OR an
 *  array of validation errors (422), which would otherwise render as "[object Object]". */
function errorMessage(data: any): string | undefined {
  const d = data?.detail;
  if (d == null) return undefined;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    const msgs = d.map((e) => e?.msg || e?.message || (typeof e === "string" ? e : "")).filter(Boolean);
    return msgs.length ? msgs.join("; ") : "Invalid input";
  }
  return typeof d === "object" ? JSON.stringify(d) : String(d);
}

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const blankLeg = (): Leg => ({
  loading_point: "", unloading_point: "", total_rent: 0, commission: [], driver_salary: 0, fastag: [], diesel: [], advance: [], freight_payments: [],
});

// Silent token refresh: when the access token expires, swap it using the long-lived
// refresh token instead of logging the user out. Deduped so concurrent 401s refresh once.
let refreshInFlight: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  const r = tokenStore.refresh();
  if (!r) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: r }),
        });
        if (!res.ok) return false;
        tokenStore.set(await res.json());
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function http<T>(path: string, init: RequestInit = {}, _retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const token = tokenStore.access();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fail fast (and clearly) if the backend is unreachable, instead of hanging.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers, signal: controller.signal });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(
      0,
      aborted
        ? `Backend timed out at ${API_URL}. Is it running? (or set VITE_USE_MOCKS=true)`
        : `Can't reach the backend at ${API_URL}. Is it running? (or set VITE_USE_MOCKS=true)`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  // Access token expired → try one silent refresh, then replay the original request.
  if (res.status === 401 && !_retried && path !== "/auth/refresh" && tokenStore.refresh()) {
    if (await tryRefresh()) return http(path, init, true);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, errorMessage(data) ?? res.statusText);
  return data as T;
}

function enrichLoadMock(l: Load): Load {
  return { ...l, totals: computeTotals(l.legs), route: routeSummary(l.legs) };
}
function recomputeVehicleProfit(vehicleId: string) {
  const store = mockStore.get();
  const v = store.vehicles.find((x) => x.id === vehicleId);
  if (!v) return;
  const done = store.loads.filter((l) => l.vehicle_id === vehicleId && l.status === "completed");
  v.trips_count = done.length;
  v.total_profit = Math.round(done.reduce((a, l) => a + l.totals.profit, 0));
}

// In-memory drivers for demo (USE_MOCKS) mode.
let mockDrivers: Driver[] = [];
function driverPrimary(d: Driver): string | null {
  const m = d.mobiles?.find((x) => x.primary) ?? d.mobiles?.[0];
  return m?.number ?? null;
}
function enrichDriverMock(d: Driver): Driver {
  const veh = mockStore.get().vehicles.find((v) => v.id === d.assigned_vehicle_id);
  return { ...d, primary_mobile: driverPrimary(d), assigned_vehicle_registration: veh?.registration_number ?? null };
}

export const api = {
  useMocks: USE_MOCKS,

  // -------- Auth --------
  async requestOtp(
    identifier: string,
    name?: string,
    signup = false,
  ): Promise<{ message: string; channel: string; dev_code?: string | null }> {
    if (USE_MOCKS) {
      await delay();
      const channel = identifier.includes("@") ? "email" : "sms";
      return { message: `Demo mode — use any 6-digit code (${channel}).`, channel, dev_code: "123456" };
    }
    return http("/auth/request-otp", { method: "POST", body: JSON.stringify({ identifier, name, signup }) });
  },

  async verifyOtp(
    identifier: string,
    code: string,
    extra?: { name?: string; email?: string; mobile?: string },
  ): Promise<TokenPair> {
    if (USE_MOCKS) {
      await delay();
      if (!/^\d{4,8}$/.test(code)) throw new ApiError(400, "Enter a valid code");
      const pair = { access_token: "mock-access", refresh_token: "mock-refresh", token_type: "bearer" };
      tokenStore.set(pair);
      return pair;
    }
    const pair = await http<TokenPair>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, code, ...extra }),
    });
    tokenStore.set(pair);
    return pair;
  },

  async me(): Promise<User> {
    if (USE_MOCKS) {
      await delay(120);
      return { id: "demo-owner", name: "Demo Owner", mobile: "9000000001", email: "owner@demo.fleet", language: "en", theme: "system" };
    }
    return http("/auth/me");
  },

  logout() {
    tokenStore.clear();
    if (USE_MOCKS) resetMocks();
  },

  // -------- Vehicles --------
  async listVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await delay(140);
      return mockStore.get().vehicles.map(enrichVehicle);
    }
    return http("/vehicles");
  },

  async getVehicle(id: string): Promise<Vehicle> {
    if (USE_MOCKS) {
      await delay(120);
      const v = mockStore.get().vehicles.find((x) => x.id === id);
      if (!v) throw new ApiError(404, "Vehicle not found");
      return enrichVehicle(v);
    }
    return http(`/vehicles/${id}`);
  },

  async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const v = enrichVehicle({
        id: nid(), owner_id: "demo-owner",
        registration_number: (payload.registration_number ?? "NEW").toUpperCase(),
        axle_type: payload.axle_type ?? "multi", length_feet: payload.length_feet ?? null,
        body_type: payload.body_type ?? "container", age_years: payload.age_years ?? null,
        chassis_number: payload.chassis_number ?? null, make: payload.make ?? null, model: payload.model ?? null,
        photo_url: null, documents: payload.documents ?? {}, status: "empty", active_load_id: null,
        document_statuses: [], overall_doc_status: "unknown", trips_count: 0, total_profit: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      store.vehicles.unshift(v);
      return v;
    }
    return http("/vehicles", { method: "POST", body: JSON.stringify(payload) });
  },

  async updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const idx = store.vehicles.findIndex((x) => x.id === id);
      if (idx < 0) throw new ApiError(404, "Vehicle not found");
      store.vehicles[idx] = enrichVehicle({ ...store.vehicles[idx], ...payload, updated_at: new Date().toISOString() });
      return store.vehicles[idx];
    }
    return http(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    if (USE_MOCKS) {
      await delay(120);
      const store = mockStore.get();
      const v = store.vehicles.find((x) => x.id === id);
      if (!v) throw new ApiError(404, "Vehicle not found");
      v.status = status;
      return enrichVehicle(v);
    }
    return http(`/vehicles/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  async deleteVehicle(id: string): Promise<void> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      store.vehicles = store.vehicles.filter((x) => x.id !== id);
      store.loads = store.loads.filter((x) => x.vehicle_id !== id);
      store.repairs = store.repairs.filter((x) => x.vehicle_id !== id);
      return;
    }
    await http(`/vehicles/${id}`, { method: "DELETE" });
  },

  // -------- Loads --------
  async listLoads(params?: { vehicleId?: string; status?: string }): Promise<Load[]> {
    if (USE_MOCKS) {
      await delay(130);
      let list = mockStore.get().loads.map(enrichLoadMock);
      if (params?.vehicleId) list = list.filter((l) => l.vehicle_id === params.vehicleId);
      if (params?.status) list = list.filter((l) => l.status === params.status);
      return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    const qs = new URLSearchParams();
    if (params?.vehicleId) qs.set("vehicle_id", params.vehicleId);
    if (params?.status) qs.set("status", params.status);
    return http(`/loads?${qs.toString()}`);
  },

  async getLoad(id: string): Promise<Load> {
    if (USE_MOCKS) {
      await delay(120);
      const l = mockStore.get().loads.find((x) => x.id === id);
      if (!l) throw new ApiError(404, "Load not found");
      return enrichLoadMock(l);
    }
    return http(`/loads/${id}`);
  },

  async createLoad(payload: { vehicle_id: string; legs?: Leg[]; start_date?: string | null; notes?: string | null }): Promise<Load> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const v = store.vehicles.find((x) => x.id === payload.vehicle_id);
      const legs = payload.legs?.length ? payload.legs : [blankLeg()];
      const load: Load = enrichLoadMock({
        id: nid(), owner_id: "demo-owner", vehicle_id: payload.vehicle_id,
        vehicle_registration: v?.registration_number ?? null, status: "ongoing",
        start_date: payload.start_date ?? new Date().toISOString().slice(0, 10), end_date: null,
        notes: payload.notes ?? null, legs, accounts_image_url: null, driver_balance: null,
        totals: computeTotals(legs), route: routeSummary(legs),
        created_at: new Date().toISOString(), closed_at: null,
      });
      store.loads.unshift(load);
      if (v) { v.status = "on_the_way"; v.active_load_id = load.id; }
      return load;
    }
    return http("/loads", { method: "POST", body: JSON.stringify(payload) });
  },

  async updateLoad(id: string, payload: { legs?: Leg[]; notes?: string | null; start_date?: string | null }): Promise<Load> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const l = store.loads.find((x) => x.id === id);
      if (!l) throw new ApiError(404, "Load not found");
      if (payload.legs) l.legs = payload.legs;
      if (payload.notes !== undefined) l.notes = payload.notes;
      if (payload.start_date !== undefined) l.start_date = payload.start_date;
      Object.assign(l, enrichLoadMock(l));
      return l;
    }
    return http(`/loads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  async closeLoad(id: string, payload: { accounts_image_url?: string | null; driver_balance?: number | null; end_date?: string | null; start_km?: number | null; end_km?: number | null; fuel_litres?: number | null }): Promise<Load> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const l = store.loads.find((x) => x.id === id);
      if (!l) throw new ApiError(404, "Load not found");
      l.status = "completed";
      l.accounts_image_url = payload.accounts_image_url ?? null;
      l.driver_balance = payload.driver_balance ?? null;
      l.start_km = payload.start_km ?? null;
      l.end_km = payload.end_km ?? null;
      l.fuel_litres = payload.fuel_litres ?? null;
      l.mileage = tripMileage(l.start_km, l.end_km, l.fuel_litres);
      l.end_date = payload.end_date ?? new Date().toISOString().slice(0, 10);
      l.closed_at = new Date().toISOString();
      Object.assign(l, enrichLoadMock(l));
      const v = store.vehicles.find((x) => x.id === l.vehicle_id);
      if (v) { v.status = "empty"; if (v.active_load_id === id) v.active_load_id = null; }
      recomputeVehicleProfit(l.vehicle_id);
      return l;
    }
    return http(`/loads/${id}/close`, { method: "POST", body: JSON.stringify(payload) });
  },

  async deleteLoad(id: string): Promise<void> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const l = store.loads.find((x) => x.id === id);
      store.loads = store.loads.filter((x) => x.id !== id);
      if (l) {
        const v = store.vehicles.find((x) => x.id === l.vehicle_id);
        if (v && v.active_load_id === id) { v.status = "empty"; v.active_load_id = null; }
        recomputeVehicleProfit(l.vehicle_id);
      }
      return;
    }
    await http(`/loads/${id}`, { method: "DELETE" });
  },

  // -------- Repairs --------
  async listRepairs(vehicleId?: string): Promise<Repair[]> {
    if (USE_MOCKS) {
      await delay(120);
      return mockStore.get().repairs.filter((r) => !vehicleId || r.vehicle_id === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
    }
    const q = vehicleId ? `?vehicle_id=${vehicleId}` : "";
    return http(`/repairs${q}`);
  },

  async createRepair(payload: Partial<Repair>): Promise<Repair> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      const v = store.vehicles.find((x) => x.id === payload.vehicle_id);
      const r: Repair = {
        id: nid(), owner_id: "demo-owner", vehicle_id: payload.vehicle_id!,
        vehicle_registration: v?.registration_number ?? null, date: payload.date ?? new Date().toISOString().slice(0, 10),
        description: payload.description ?? "", amount: payload.amount ?? 0, vendor: payload.vendor ?? null, odometer_km: payload.odometer_km ?? null,
      };
      store.repairs.unshift(r);
      return r;
    }
    return http("/repairs", { method: "POST", body: JSON.stringify(payload) });
  },

  async deleteRepair(id: string): Promise<void> {
    if (USE_MOCKS) {
      await delay();
      const store = mockStore.get();
      store.repairs = store.repairs.filter((r) => r.id !== id);
      return;
    }
    await http(`/repairs/${id}`, { method: "DELETE" });
  },

  // -------- Analytics / Profit / Notifications --------
  async dashboard(months = 6): Promise<DashboardResponse> {
    if (USE_MOCKS) {
      await delay(160);
      return mockDashboard(months);
    }
    return http(`/analytics/dashboard?months=${months}`);
  },

  async profitByVehicle(): Promise<VehicleProfit[]> {
    if (USE_MOCKS) {
      await delay(140);
      return vehicleProfitList();
    }
    return http("/analytics/profit");
  },

  async vehicleTrips(vehicleId: string): Promise<TripProfitRow[]> {
    if (USE_MOCKS) {
      await delay(130);
      return tripsForVehicle(vehicleId);
    }
    return http(`/analytics/profit/${vehicleId}`);
  },

  async reminders(): Promise<ReminderCard[]> {
    if (USE_MOCKS) {
      await delay(120);
      return mockReminders();
    }
    return http("/notifications");
  },

  // -------- Drivers --------
  async listDrivers(): Promise<Driver[]> {
    if (USE_MOCKS) { await delay(120); return mockDrivers.map(enrichDriverMock); }
    return http("/drivers");
  },
  async createDriver(payload: Partial<Driver>): Promise<Driver> {
    if (USE_MOCKS) {
      await delay();
      const d: Driver = {
        id: nid(), owner_id: "demo-owner", name: payload.name ?? "Driver",
        mobiles: payload.mobiles ?? [], licence_number: payload.licence_number ?? null,
        licence_image_url: payload.licence_image_url ?? null, status: "inactive",
        assigned_vehicle_id: null, assigned_vehicle_registration: null, primary_mobile: null,
        advance_amount: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      mockDrivers.unshift(d);
      return enrichDriverMock(d);
    }
    return http("/drivers", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateDriver(id: string, payload: Partial<Driver>): Promise<Driver> {
    if (USE_MOCKS) {
      await delay();
      const d = mockDrivers.find((x) => x.id === id);
      if (!d) throw new ApiError(404, "Driver not found");
      Object.assign(d, payload, { updated_at: new Date().toISOString() });
      return enrichDriverMock(d);
    }
    return http(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async assignDriverVehicle(id: string, vehicle_id: string | null): Promise<Driver> {
    if (USE_MOCKS) {
      await delay(120);
      const d = mockDrivers.find((x) => x.id === id);
      if (!d) throw new ApiError(404, "Driver not found");
      if (vehicle_id) {
        // Allow up to TWO live drivers per vehicle.
        const others = mockDrivers.filter((o) => o.id !== id && o.assigned_vehicle_id === vehicle_id);
        if (others.length >= 2) throw new ApiError(409, "This vehicle already has 2 drivers assigned. Free one before adding another.");
        d.assigned_vehicle_id = vehicle_id; d.status = "active";
      } else { d.assigned_vehicle_id = null; d.status = "inactive"; }
      return enrichDriverMock(d);
    }
    return http(`/drivers/${id}/assign`, { method: "PATCH", body: JSON.stringify({ vehicle_id }) });
  },
  async setDriverAdvance(id: string, advance_amount: number): Promise<Driver> {
    if (USE_MOCKS) {
      await delay(120);
      const d = mockDrivers.find((x) => x.id === id);
      if (!d) throw new ApiError(404, "Driver not found");
      d.advance_amount = advance_amount;
      return enrichDriverMock(d);
    }
    return http(`/drivers/${id}/advance`, { method: "PATCH", body: JSON.stringify({ advance_amount }) });
  },
  async deleteDriver(id: string): Promise<void> {
    if (USE_MOCKS) { await delay(); mockDrivers = mockDrivers.filter((x) => x.id !== id); return; }
    await http(`/drivers/${id}`, { method: "DELETE" });
  },

  reportUrl(kind: "profit.csv" | "loads.csv" | "fleet.pdf"): string {
    return `${API_URL}/api/v1/reports/${kind}`;
  },

  /** Download a report WITH the auth header (a plain <a href> can't send it → 401),
   *  then save it via an object URL. */
  async downloadReport(kind: "profit.csv" | "loads.csv" | "fleet.pdf"): Promise<void> {
    const token = tokenStore.access();
    const res = await fetch(this.reportUrl(kind), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind; // e.g. "profit.csv"
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
