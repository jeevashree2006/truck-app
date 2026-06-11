// Shared domain types — mirror the FastAPI schemas (apps/api/app/schemas).

export type DocStatus = "valid" | "expiring" | "expired" | "unknown";
export type DocumentType =
  | "ddc"
  | "rc"
  | "insurance"
  | "fitness"
  | "permit"
  | "road_tax"
  | "puc"
  | "national_permit";
export type AxleType = "single" | "multi";
export type BodyType = "open" | "container" | "trailer" | "tanker" | "other";
export type VehicleStatus = "empty" | "on_the_way" | "waiting_for_unload" | "maintenance";
export type TripStatus = "ongoing" | "completed" | "cancelled";
export type Severity = "high" | "medium" | "low";

export interface DocumentInfo {
  number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  doc_url?: string | null;
  doc_urls?: string[];
}

export interface DocumentStatus {
  type: DocumentType;
  number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  doc_url?: string | null;
  doc_urls?: string[];
  status: DocStatus;
  days_to_expiry?: number | null;
  progress?: number | null;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  registration_number: string;
  axle_type: AxleType;
  length_feet?: number | null;
  body_type: BodyType;
  manufacture_month?: string | null; // "YYYY-MM"
  age_years?: number | null;
  chassis_number?: string | null;
  make?: string | null;
  model?: string | null;
  photo_url?: string | null;
  documents: Partial<Record<DocumentType, DocumentInfo>>;
  status: VehicleStatus;
  active_load_id?: string | null;
  document_statuses: DocumentStatus[];
  overall_doc_status: DocStatus;
  trips_count: number;
  total_profit: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MoneyEntry {
  amount: number;
  note?: string | null;
  at?: string | null;
}

export interface Leg {
  loading_point: string;
  unloading_point: string;
  total_rent: number;
  commission: number;
  driver_salary: number;
  fastag: number;
  diesel: MoneyEntry[];
  advance: MoneyEntry[];
  freight_payments: MoneyEntry[]; // received from this leg's transporter
  // computed:
  diesel_total?: number;
  advance_total?: number;
  spend?: number;
  profit?: number;
  freight_received?: number;
  freight_pending?: number;
  freight_fully_paid?: boolean;
}

export interface LoadTotals {
  total_rent: number;
  total_diesel: number;
  total_commission: number;
  total_salary: number;
  total_fastag: number;
  total_advance: number;
  spend: number;
  profit: number;
  leg_count: number;
  expected_driver_balance: number;
  freight_received: number;
  freight_pending: number;
  freight_fully_paid: boolean;
}

export interface Load {
  id: string;
  owner_id: string;
  vehicle_id: string;
  vehicle_registration?: string | null;
  status: TripStatus;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  legs: Leg[];
  accounts_image_url?: string | null;
  driver_balance?: number | null;
  totals: LoadTotals;
  route?: string | null;
  created_at?: string | null;
  closed_at?: string | null;
}

export interface Repair {
  id: string;
  owner_id: string;
  vehicle_id: string;
  vehicle_registration?: string | null;
  date: string;
  description: string;
  amount: number;
  vendor?: string | null;
  odometer_km?: number | null;
}

export interface ReminderCard {
  type: "document_expiry" | "daily_summary" | "system";
  title: string;
  body: string;
  vehicle_id?: string | null;
  severity: Severity;
  days?: number | null;
}

export interface DashboardKpis {
  total_vehicles: number;
  vehicles_on_way: number;
  vehicles_empty: number;
  vehicles_waiting: number;
  active_loads: number;
  trips_this_month: number;
  rent_this_month: number;
  spend_this_month: number;
  profit_this_month: number;
  profit_all_time: number;
  documents_expiring: number;
}

export interface MonthlyProfitPoint {
  month: string;
  label: string;
  rent: number;
  spend: number;
  profit: number;
  trips: number;
}

export interface SpendSlice {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface VehicleProfit {
  vehicle_id: string;
  registration_number: string;
  body_type?: string | null;
  status: string;
  trips_count: number;
  total_rent: number;
  total_spend: number;
  total_profit: number;
  avg_profit: number;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  monthly: MonthlyProfitPoint[];
  spend_breakdown: SpendSlice[];
  status_breakdown: StatusSlice[];
  top_vehicles: VehicleProfit[];
}

export interface TripProfitRow {
  load_id: string;
  route: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  rent: number;
  spend: number;
  profit: number;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  language: string;
  theme: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}
