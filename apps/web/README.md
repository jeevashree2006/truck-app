# Fleet Owner Web Dashboard (React + TS + Tailwind)

Vite SPA. Ships with a **full in-memory mock layer**, so it runs and demos instantly
without a backend.

## Run

```bash
npm install
cp .env.example .env     # VITE_USE_MOCKS=true (default) → demo data; set false + VITE_API_URL for real API
npm run dev              # http://localhost:3000   (requires Node 18+)
npm run build            # type-check + production build → dist/
npm run lint             # tsc --noEmit
```

## Structure

```
src/
├── main.tsx, App.tsx        entry + routes (auth-gated)
├── context/                 Theme (dark/light/system), I18n (en/ta/hi), Auth
├── lib/                     api (real + mocks), domain (profit/doc math), mocks, format, constants
├── components/
│   ├── ui/                  Card, Button, Modal, DonutChart, ProgressBar, KpiCard, FAB, DocStatusChip, StatusChip…
│   ├── cards/               VehicleCard, LoadCard, ReminderCard
│   ├── charts/              ProfitChart (Recharts)
│   ├── forms/               VehicleForm, MoneyEntryList (diesel/advance)
│   └── layout/              Sidebar (animated collapse), Topbar, MobileNav, AppLayout
└── pages/                   Login, Dashboard, Vehicles, VehicleDetail, LoadEditor, Profit, Settings
```

## Notes
- **Reusable components** map 1:1 to the spec: Vehicle Card, Document Status Chip, Animated Donut Chart, Trip/Load list item, FAB, date pickers, KPI cards.
- **Animations:** Framer Motion (entrance, layout, count-up KPIs, animated donut/progress).
- **Dark mode** (auto + manual) and **multi-language** (English / Tamil / Hindi) via context.
- The Vite build requires **Node 18+** (Node 16 errors on `crypto.getRandomValues`).
