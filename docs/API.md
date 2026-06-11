# Fleet Owner API Reference

Base URL: `http://localhost:8000` · All resource endpoints are under `/api/v1`.
Interactive docs (Swagger UI): `GET /docs` · OpenAPI JSON: `GET /openapi.json`.

Auth: send `Authorization: Bearer <access_token>` on every protected request.

---

## Auth

### `POST /api/v1/auth/request-otp`
Issue an OTP to a **mobile number or email** (channel auto-detected).
```json
{ "identifier": "9876543210", "name": "Ravi" }
```
→ `{ "message": "OTP sent via sms.", "channel": "sms", "dev_code": "123456" }`
`dev_code` is only returned in dev mode when no SMS/email provider is configured.

### `POST /api/v1/auth/verify-otp`
Verify the code; creates the user on first sign-in. Returns a JWT pair.
```json
{ "identifier": "9876543210", "code": "123456", "name": "Ravi", "email": "ravi@gmail.com" }
```
→ `{ "access_token": "…", "refresh_token": "…", "token_type": "bearer" }`

### `POST /api/v1/auth/refresh`  → new token pair from `{ "refresh_token": "…" }`
### `GET  /api/v1/auth/me`       → current user
### `PATCH /api/v1/users/me`     → update `{ name?, email?, mobile?, language?, theme? }`
### `POST /api/v1/users/me/push-token` → register an Expo/FCM token `{ "token": "…" }`

---

## Vehicles

| Method | Path | Body / notes |
|--------|------|--------------|
| `GET` | `/vehicles` | list (enriched with document status + lifetime profit) |
| `POST` | `/vehicles` | create — see body below |
| `GET` | `/vehicles/{id}` | one vehicle |
| `PATCH` | `/vehicles/{id}` | partial update (incl. `status`, `documents`) |
| `PATCH` | `/vehicles/{id}/status` | `{ "status": "on_the_way" }` |
| `DELETE` | `/vehicles/{id}` | cascade-deletes its loads + repairs |

**Create body:**
```json
{
  "registration_number": "TN28AB1234",
  "axle_type": "multi",            // single | multi
  "length_feet": 32,               // 20, 32, …
  "body_type": "container",        // open | container | trailer | tanker | other
  "age_years": 3,
  "chassis_number": "MAT4827…",
  "make": "Tata", "model": "LPT 3118",
  "documents": {
    "rc":  { "number": "RC-1234", "issue_date": "2023-01-01", "expiry_date": "2028-01-01" },
    "ddc": { "number": "DDC-1234", "expiry_date": "2026-09-01" },
    "insurance": { "expiry_date": "2026-06-29" }
  }
}
```
Each document status is computed server-side: `valid` (>30d), `expiring` (≤30d), `expired`, `unknown`.

---

## Loads (multi-leg trips)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/loads?vehicle_id=&status=` | list (with computed totals + route) |
| `POST` | `/loads` | create; sets the vehicle to `on_the_way` |
| `GET` | `/loads/{id}` | one load |
| `PATCH` | `/loads/{id}` | replace `legs` / `notes` / `start_date` |
| `POST` | `/loads/{id}/close` | finalise + free the vehicle |
| `DELETE` | `/loads/{id}` | delete |

**Create / update body:**
```json
{
  "vehicle_id": "665…",
  "start_date": "2026-06-01",
  "legs": [
    {
      "loading_point": "Namakkal", "unloading_point": "Mumbai",
      "total_rent": 95000, "commission": 4000, "driver_salary": 8000, "fastag": 2200,
      "diesel":  [ { "amount": 18000, "note": "Fill" }, { "amount": 16000 } ],
      "advance": [ { "amount": 40000, "note": "Advance" } ]
    },
    { "loading_point": "Mumbai", "unloading_point": "Madurai", "total_rent": 88000, "...": "..." }
  ]
}
```

**Close body** — `POST /loads/{id}/close`:
```json
{ "accounts_image_url": "data:image/…", "driver_balance": 5000, "end_date": "2026-06-08" }
```

Every load response includes computed `totals`:
```json
"totals": {
  "total_rent": 183000, "total_diesel": 66000, "total_commission": 7500,
  "total_salary": 15500, "total_fastag": 4100, "total_advance": 75000,
  "spend": 93100, "profit": 89900, "leg_count": 2, "expected_driver_balance": 4900
}
```

---

## Repairs

| Method | Path | Body |
|--------|------|------|
| `GET` | `/repairs?vehicle_id=` | list |
| `POST` | `/repairs` | `{ vehicle_id, date, description, amount, vendor?, odometer_km? }` |
| `PATCH` | `/repairs/{id}` | partial |
| `DELETE` | `/repairs/{id}` | delete |

---

## Analytics / Profit

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/analytics/dashboard?months=6` | KPIs, monthly rent/spend/profit, spend breakdown, status breakdown, top vehicles |
| `GET` | `/analytics/profit` | per-vehicle profit summary (the Profit page) |
| `GET` | `/analytics/profit/{vehicle_id}` | every trip for a vehicle with its profit |

## Notifications

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/notifications` | live colour-coded document-expiry reminder cards |
| `GET` | `/notifications/daily-summary` | today's summary |
| `POST` | `/notifications/daily-summary/send` | email the summary (used by the scheduled job) |

## Reports

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/reports/fleet.pdf?months=6` | profit PDF (ReportLab) |
| `GET` | `/reports/profit.csv` | per-vehicle profit CSV |
| `GET` | `/reports/loads.csv?vehicle_id=` | all loads CSV |

## Meta

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/health` | `{ status, app, env, db }` |
| `GET` | `/api/v1/reference` | enum values (axle/body/status/document/trip) + thresholds + languages |
