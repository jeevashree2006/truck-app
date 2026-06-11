import type { AxleType, BodyType, DocumentType, VehicleStatus } from "@/types";

export const DOCUMENT_TYPES: DocumentType[] = [
  "ddc",
  "rc",
  "insurance",
  "fitness",
  "permit",
  "national_permit",
  "road_tax",
  "puc",
];

export const AXLE_TYPES: AxleType[] = ["single", "multi"];
export const BODY_TYPES: BodyType[] = ["open", "container", "trailer", "tanker", "other"];
export const VEHICLE_STATUSES: VehicleStatus[] = ["empty", "on_the_way", "waiting_for_unload", "maintenance"];
export const COMMON_LENGTHS_FEET = [14, 17, 19, 20, 22, 24, 32, 40];
export const TRIP_STATUSES = ["ongoing", "completed", "cancelled"] as const;

// Days-before-expiry threshold for the yellow "expiring soon" state (matches backend).
export const EXPIRING_SOON_DAYS = 30;
