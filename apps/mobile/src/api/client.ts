/**
 * Typed API client for the FastAPI backend with a graceful in-memory mock fallback.
 *
 *  - EXPO_PUBLIC_USE_MOCKS === 'true'  → every call served from a mutable mock store.
 *  - Otherwise hit the real backend; on network/5xx failure, fall back to mocks so the
 *    UI keeps working offline / in demos.
 */
import { computeTotals, enrichVehicle, routeSummary } from '@/utils/domain';
import type {
  DashboardResponse,
  Leg,
  Load,
  OTPRequested,
  Repair,
  ReminderCard,
  TokenPair,
  TripProfitRow,
  User,
  Vehicle,
  VehicleInput,
  VehicleProfit,
  VehicleStatus,
} from '@/types';
import {
  buildStore,
  mockDashboard,
  mockReminders,
  mockUser,
  nid,
  tripsForVehicle,
  vehicleProfitList,
  type MockStore,
} from './mocks';
import { loadTokens } from './tokenStore';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';
export const API_PREFIX = '/api/v1';
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';
/** Back-compat alias used by some screens. */
export const usingMocks = USE_MOCKS;
const REQUEST_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  anonymous?: boolean;
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!opts.anonymous) {
      const tokens = await loadTokens();
      if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(data?.detail ?? `Request failed: ${res.status}`, res.status);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// Mutable mock store (so create/update/delete behave in demo mode).
const store: MockStore = buildStore();
const blankLeg = (): Leg => ({ loading_point: '', unloading_point: '', total_rent: 0, commission: 0, driver_salary: 0, fastag: 0, diesel: [], advance: [] });
const enrichLoad = (l: Load): Load => ({ ...l, totals: computeTotals(l.legs), route: routeSummary(l.legs) });
function recomputeVehicleProfit(vehicleId: string) {
  const v = store.vehicles.find((x) => x.id === vehicleId);
  if (!v) return;
  const done = store.loads.filter((l) => l.vehicle_id === vehicleId && l.status === 'completed');
  v.trips_count = done.length;
  v.total_profit = Math.round(done.reduce((a, l) => a + l.totals.profit, 0));
}

export const api = {
  // ---- Auth ----
  async requestOtp(identifier: string, name?: string): Promise<OTPRequested> {
    if (USE_MOCKS) {
      return { message: 'Demo mode — use any 6-digit code.', channel: identifier.includes('@') ? 'email' : 'sms', dev_code: '123456' };
    }
    return rawRequest('/auth/request-otp', { method: 'POST', anonymous: true, body: { identifier, name } });
  },

  async verifyOtp(identifier: string, code: string, extra?: { name?: string; email?: string; mobile?: string }): Promise<TokenPair> {
    if (USE_MOCKS) {
      if (!/^\d{4,8}$/.test(code)) throw new ApiError('Enter a valid code', 400);
      return { access_token: 'mock-access', refresh_token: 'mock-refresh', token_type: 'bearer' };
    }
    return rawRequest('/auth/verify-otp', { method: 'POST', anonymous: true, body: { identifier, code, ...extra } });
  },

  async me(): Promise<User> {
    if (USE_MOCKS) return mockUser;
    return rawRequest('/auth/me');
  },

  // ---- Vehicles ----
  async listVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) return store.vehicles.map(enrichVehicle);
    return rawRequest('/vehicles');
  },

  async getVehicle(id: string): Promise<Vehicle> {
    if (USE_MOCKS) {
      const v = store.vehicles.find((x) => x.id === id);
      if (!v) throw new ApiError('Vehicle not found', 404);
      return enrichVehicle(v);
    }
    return rawRequest(`/vehicles/${id}`);
  },

  async createVehicle(input: VehicleInput): Promise<Vehicle> {
    if (USE_MOCKS) {
      const v = enrichVehicle({
        id: nid(), owner_id: 'demo-owner', ...input, status: 'empty', active_load_id: null,
        photo_url: null, document_statuses: [], overall_doc_status: 'unknown', trips_count: 0, total_profit: 0,
      } as Vehicle);
      store.vehicles = [v, ...store.vehicles];
      return v;
    }
    return rawRequest('/vehicles', { method: 'POST', body: input });
  },

  async updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
    if (USE_MOCKS) {
      const idx = store.vehicles.findIndex((v) => v.id === id);
      if (idx === -1) throw new ApiError('Vehicle not found', 404);
      store.vehicles[idx] = enrichVehicle({ ...store.vehicles[idx], ...input } as Vehicle);
      return store.vehicles[idx];
    }
    return rawRequest(`/vehicles/${id}`, { method: 'PATCH', body: input });
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    if (USE_MOCKS) {
      const v = store.vehicles.find((x) => x.id === id);
      if (!v) throw new ApiError('Vehicle not found', 404);
      v.status = status;
      return enrichVehicle(v);
    }
    return rawRequest(`/vehicles/${id}/status`, { method: 'PATCH', body: { status } });
  },

  async deleteVehicle(id: string): Promise<void> {
    if (USE_MOCKS) {
      store.vehicles = store.vehicles.filter((v) => v.id !== id);
      store.loads = store.loads.filter((l) => l.vehicle_id !== id);
      store.repairs = store.repairs.filter((r) => r.vehicle_id !== id);
      return;
    }
    await rawRequest(`/vehicles/${id}`, { method: 'DELETE' });
  },

  // ---- Loads ----
  async listLoads(params?: { vehicleId?: string; status?: string }): Promise<Load[]> {
    if (USE_MOCKS) {
      let list = store.loads.map(enrichLoad);
      if (params?.vehicleId) list = list.filter((l) => l.vehicle_id === params.vehicleId);
      if (params?.status) list = list.filter((l) => l.status === params.status);
      return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
    const qs = new URLSearchParams();
    if (params?.vehicleId) qs.set('vehicle_id', params.vehicleId);
    if (params?.status) qs.set('status', params.status);
    return rawRequest(`/loads?${qs.toString()}`);
  },

  async getLoad(id: string): Promise<Load> {
    if (USE_MOCKS) {
      const l = store.loads.find((x) => x.id === id);
      if (!l) throw new ApiError('Load not found', 404);
      return enrichLoad(l);
    }
    return rawRequest(`/loads/${id}`);
  },

  async createLoad(payload: { vehicle_id: string; legs?: Leg[]; start_date?: string | null; notes?: string | null }): Promise<Load> {
    if (USE_MOCKS) {
      const v = store.vehicles.find((x) => x.id === payload.vehicle_id);
      const legs = payload.legs?.length ? payload.legs : [blankLeg()];
      const load = enrichLoad({
        id: nid(), owner_id: 'demo-owner', vehicle_id: payload.vehicle_id, vehicle_registration: v?.registration_number ?? null,
        status: 'ongoing', start_date: payload.start_date ?? new Date().toISOString().slice(0, 10), end_date: null,
        notes: payload.notes ?? null, legs, accounts_image_url: null, driver_balance: null,
        totals: computeTotals(legs), route: routeSummary(legs), created_at: new Date().toISOString(), closed_at: null,
      });
      store.loads = [load, ...store.loads];
      if (v) { v.status = 'on_the_way'; v.active_load_id = load.id; }
      return load;
    }
    return rawRequest('/loads', { method: 'POST', body: payload });
  },

  async updateLoad(id: string, payload: { legs?: Leg[]; notes?: string | null; start_date?: string | null }): Promise<Load> {
    if (USE_MOCKS) {
      const l = store.loads.find((x) => x.id === id);
      if (!l) throw new ApiError('Load not found', 404);
      if (payload.legs) l.legs = payload.legs;
      if (payload.notes !== undefined) l.notes = payload.notes;
      Object.assign(l, enrichLoad(l));
      return l;
    }
    return rawRequest(`/loads/${id}`, { method: 'PATCH', body: payload });
  },

  async closeLoad(id: string, payload: { accounts_image_url?: string | null; driver_balance?: number | null; end_date?: string | null }): Promise<Load> {
    if (USE_MOCKS) {
      const l = store.loads.find((x) => x.id === id);
      if (!l) throw new ApiError('Load not found', 404);
      l.status = 'completed';
      l.accounts_image_url = payload.accounts_image_url ?? null;
      l.driver_balance = payload.driver_balance ?? null;
      l.end_date = payload.end_date ?? new Date().toISOString().slice(0, 10);
      l.closed_at = new Date().toISOString();
      Object.assign(l, enrichLoad(l));
      const v = store.vehicles.find((x) => x.id === l.vehicle_id);
      if (v) { v.status = 'empty'; if (v.active_load_id === id) v.active_load_id = null; }
      recomputeVehicleProfit(l.vehicle_id);
      return l;
    }
    return rawRequest(`/loads/${id}/close`, { method: 'POST', body: payload });
  },

  async deleteLoad(id: string): Promise<void> {
    if (USE_MOCKS) {
      const l = store.loads.find((x) => x.id === id);
      store.loads = store.loads.filter((x) => x.id !== id);
      if (l) {
        const v = store.vehicles.find((x) => x.id === l.vehicle_id);
        if (v && v.active_load_id === id) { v.status = 'empty'; v.active_load_id = null; }
        recomputeVehicleProfit(l.vehicle_id);
      }
      return;
    }
    await rawRequest(`/loads/${id}`, { method: 'DELETE' });
  },

  // ---- Repairs ----
  async listRepairs(vehicleId?: string): Promise<Repair[]> {
    if (USE_MOCKS) return store.repairs.filter((r) => !vehicleId || r.vehicle_id === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
    const q = vehicleId ? `?vehicle_id=${vehicleId}` : '';
    return rawRequest(`/repairs${q}`);
  },

  async createRepair(payload: Partial<Repair>): Promise<Repair> {
    if (USE_MOCKS) {
      const v = store.vehicles.find((x) => x.id === payload.vehicle_id);
      const r: Repair = {
        id: nid(), vehicle_id: payload.vehicle_id!, vehicle_registration: v?.registration_number ?? null,
        date: payload.date ?? new Date().toISOString().slice(0, 10), description: payload.description ?? '',
        amount: payload.amount ?? 0, vendor: payload.vendor ?? null, odometer_km: payload.odometer_km ?? null,
      };
      store.repairs = [r, ...store.repairs];
      return r;
    }
    return rawRequest('/repairs', { method: 'POST', body: payload });
  },

  async deleteRepair(id: string): Promise<void> {
    if (USE_MOCKS) { store.repairs = store.repairs.filter((r) => r.id !== id); return; }
    await rawRequest(`/repairs/${id}`, { method: 'DELETE' });
  },

  // ---- Analytics / Profit / Notifications ----
  async dashboard(months = 6): Promise<DashboardResponse> {
    if (USE_MOCKS) return mockDashboard(store, months);
    return rawRequest(`/analytics/dashboard?months=${months}`);
  },

  async profitByVehicle(): Promise<VehicleProfit[]> {
    if (USE_MOCKS) return vehicleProfitList(store);
    return rawRequest('/analytics/profit');
  },

  async vehicleTrips(vehicleId: string): Promise<TripProfitRow[]> {
    if (USE_MOCKS) return tripsForVehicle(store, vehicleId);
    return rawRequest(`/analytics/profit/${vehicleId}`);
  },

  async reminders(): Promise<ReminderCard[]> {
    if (USE_MOCKS) return mockReminders(store);
    return rawRequest('/notifications');
  },
};
