# 🚛 Fleet Owner — Lorry & Container Trip Accounting

A production-structured app for **fleet / lorry / container owners** (not drivers, not
customers) to enroll vehicles, run **multi-leg loads (trips)**, log diesel, advances,
commission, driver salary and FASTag, and see the **real profit on every trip and per
vehicle** — with colour-coded document-expiry tracking, OTP login (mobile **or** Gmail),
dark mode and 3 languages (English / Tamil / Hindi).

> Profit model: **profit = total rent − (diesel + commission + driver salary + FASTag)**.
> Driver advances are treated as floated cash and reconciled separately against the
> balance the driver returns.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Auth** | Passwordless OTP login by **mobile number or Gmail** (capture name on sign-up). SMS/email channels auto-detected; dev mode returns the code on screen. |
| **Vehicle enrolment** | Number, **axle (single/multi)**, **length (20/32 ft…)**, **body (open/container/trailer…)**, age, chassis no, make/model. Documents: **DDC, RC**, insurance, fitness, permit, national permit, road tax, PUC. Multiple vehicles. |
| **Vehicle list** | Live operational **status — empty / on the way / waiting to unload / maintenance**, lifetime profit, colour-coded document strip. |
| **Vehicle screen** | Tabs for **Loads**, **Repairs**, **Documents** (timeline progress bars), status switch, edit/delete. |
| **Loads (multi-leg trips)** | One trip = one or more **legs** (e.g. *Namakkal → Mumbai → Madurai*) added with a **+**. Each leg: loading/unloading point, total rent, commission, driver salary, FASTag, **multiple diesel fills**, **multiple advances**. Live per-leg + trip totals. |
| **Close trip** | Upload the accounts photo (“kanakku sheet”), confirm the **balance returned by driver**, confirmation popup → finalise **profit**, free the vehicle. |
| **Profit page** | Every vehicle with total profit → tap to expand **all trips with their profit**. |
| **Documents** | Colour-coded status (🟢 valid / 🟡 expiring / 🔴 expired) + expiry timeline + daily reminder feed. |
| **Reports** | Profit **PDF**, vehicle-profit **CSV**, loads **CSV**. |
| **UX** | Tesla/Notion/Uber-Fleet inspired UI, gradient headers, soft shadows, Framer-Motion animations, **dark mode** (auto + manual), **i18n** (en/ta/hi), responsive (desktop + mobile). |

---

## 🗂 Monorepo layout

```
truck-app/
├── apps/
│   ├── api/          FastAPI + MongoDB backend  (auth, vehicles, loads, repairs, profit, reports)
│   ├── web/          React + TypeScript + Tailwind dashboard  (Vite)
│   └── mobile/       Expo + React Native app
├── packages/
│   └── shared/       Shared TypeScript domain types
├── docs/
│   ├── API.md                  REST endpoint reference
│   ├── ER-DIAGRAM.md           Mermaid data model
│   ├── DEPLOYMENT.md           Render / Vercel / Atlas / Play Store
│   └── postman_collection.json Importable Postman collection
└── README.md
```

---

## 🚀 Quick start

### 1. Backend (FastAPI)

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate     # Python 3.11+
pip install -r requirements.txt
cp .env.example .env                                   # defaults work for local Mongo
uvicorn app.main:app --reload                          # http://localhost:8000/docs
python seed_demo.py                                    # optional: demo owner + data
```

- No SendGrid/SMS keys? OTP codes are **printed to the console** and returned by the API in dev mode.
- No MongoDB locally? Point `MONGODB_URI` at a free **MongoDB Atlas M0** cluster.

### 2. Web dashboard (React)

```bash
cd apps/web
npm install
cp .env.example .env       # VITE_USE_MOCKS=true by default → runs with rich demo data, no backend
npm run dev                # http://localhost:3000
```

> The web app ships with a **full in-memory mock layer**, so `npm run dev` is instantly
> demoable. Set `VITE_USE_MOCKS=false` and `VITE_API_URL=http://localhost:8000` to use the
> real backend. **Requires Node 18+** (Vite 5).

### 🔐 Real-time OTP (not the demo `123456`)

The backend OTP is **always real**: each `request-otp` generates a fresh random code,
stores only its HMAC in Mongo with a TTL, and `verify-otp` checks it server-side. The
demo `123456` only exists in the web/mobile **mock** layer. To use the real flow:

1. Run the backend (`apps/api`) + MongoDB, and set `apps/web/.env`:
   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=            # leave empty in dev — Vite proxies /api → backend (no CORS)
   ```
   (For production, set `VITE_API_URL` to the deployed backend URL.)
2. **Delivery** — pick how the code reaches the user (set keys in `apps/api/.env`):
   - **No provider (dev):** the code is logged to the API console **and** returned as
     `dev_code` so you can test the real round-trip immediately.
   - **Email (Gmail) — easiest real delivery:** set `SENDGRID_API_KEY` (free tier). Sign
     in with an email and the code is emailed for real.
   - **SMS — Twilio** (international, free trial): set `TWILIO_ACCOUNT_SID`,
     `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. **MSG91** (India): set `MSG91_AUTH_KEY` +
     `MSG91_FLOW_ID` (DLT-approved flow with an `OTP` variable).

   Once a provider is configured for that channel, `dev_code` is no longer returned —
   the code is delivered to the phone/inbox instead.

> Verified locally end-to-end: `request-otp` → server-generated code → `verify-otp` →
> real JWT → live dashboard, with email and mobile sign-in, and multiple mobile-only
> signups (the earlier duplicate-key bug on the `email` index is fixed via a partial index).

### 3. Mobile (Expo)

```bash
cd apps/mobile
npm install
npx expo start             # scan QR with Expo Go, or press a / i for emulators
```

---

## 🧮 The profit calculation (worked example)

A trip *Namakkal → Mumbai → Madurai* (2 legs):

| | Rent | Diesel | Commission | Salary | FASTag | Advance |
|--|-----:|-------:|-----------:|-------:|-------:|--------:|
| Leg 1 | 95,000 | 34,000 | 4,000 | 8,000 | 2,200 | 40,000 |
| Leg 2 | 88,000 | 32,000 | 3,500 | 7,500 | 1,900 | 35,000 |
| **Total** | **183,000** | 66,000 | 7,500 | 15,500 | 4,100 | 75,000 |

```
spend  = diesel + commission + salary + fastag = 66,000 + 7,500 + 15,500 + 4,100 = 93,100
profit = rent − spend                          = 183,000 − 93,100              = ₹89,900
```

Advance (₹75,000) is **not** part of spend — it is floated cash. The expected balance the
driver returns ≈ `advance − (diesel + fastag)`, reconciled at close against the entered amount.

---

## 🛠 Tech stack

- **Backend:** FastAPI · Motor (async MongoDB) · PyJWT · ReportLab (PDF) · SendGrid (email) · httpx (SMS)
- **Web:** React 18 · TypeScript · Vite · TailwindCSS · Recharts · Framer Motion · React Router
- **Mobile:** Expo (SDK 51) · React Native · TypeScript · Expo Router · Reanimated
- **DB:** MongoDB Atlas — collections: `users`, `vehicles`, `loads`, `repairs`, `otps`, `notifications`

See [docs/API.md](docs/API.md), [docs/ER-DIAGRAM.md](docs/ER-DIAGRAM.md) and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

---

## ✅ Status

- **Backend** — complete: OTP auth (mobile/email), vehicles, loads (multi-leg + close), repairs, profit analytics, PDF/CSV reports.
- **Web** — complete & verified (type-checked, production build, screenshots of every screen).
- **Mobile** — Expo app scaffold (auth, dashboard, vehicles, vehicle detail, load editor, profit).
- **Phase 3 (offline sync, cloud backup, push) ** — hooks in place (Expo push token endpoint, daily-summary job); full sync is a follow-up.
