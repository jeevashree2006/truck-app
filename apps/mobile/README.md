# Fleet Owner Mobile (Expo + React Native + TypeScript)

Native app for lorry/container owners — loads/profit model, matching the web dashboard
and FastAPI backend. Built with **Expo SDK 51**, **expo-router**, **Reanimated**, and a
shared design system (theme tokens identical to the web app).

## Run

```bash
npm install
cp .env.example .env        # EXPO_PUBLIC_USE_MOCKS=true (default) → demo data, no backend
npx expo start              # press i / a for simulators, or scan the QR with Expo Go
```

Point at the backend by setting in `.env`:
```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000     # Android emulator (use your LAN IP on device)
```

> Placeholder assets: add `assets/icon.png` (1024×1024) and `assets/splash.png` before
> building a store binary. The app runs in Expo Go without them.

## Structure

```
app/                         expo-router routes
├── _layout.tsx              providers + auth-guarded Stack
├── (auth)/login, verify     OTP sign-in (mobile or Gmail)
├── (tabs)/
│   ├── _layout              custom animated tab bar
│   ├── index                Dashboard (KPIs, profit chart, spend donut, alerts)
│   ├── vehicles             vehicle list (status + profit)
│   ├── profit               profit by vehicle → trips
│   └── more                 profile, theme, language, logout
├── vehicle/[id]             detail: Loads / Repairs / Documents tabs + status
├── vehicle/new              enroll vehicle (axle/feet/body/age/chassis)
└── loads/[id]               multi-leg load editor + close-trip

src/
├── api/        client (real + mock fallback), mocks, tokenStore (SecureStore)
├── components/ Screen, GradientHeader, SectionCard, Button, TextField, SelectField,
│               KpiCard, DonutChart, MiniBarChart, ProgressBar, DocStatusChip,
│               StatusChip, VehicleCard, LoadCard, ReminderCardView, FAB, EmptyState
├── theme/      design tokens + ThemeProvider (light/dark/system)
├── i18n/       en / ta / hi
├── hooks/      useAsync, useCountUp
└── utils/      format, domain (profit + document-status math, label maps)
```

## Build (Android AAB → Play Store)

```bash
npm i -g eas-cli && eas login
eas build -p android --profile production
eas submit -p android
```

See [../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

> Note: this app shares its profit math (`spend = diesel + commission + salary + fastag`,
> `profit = rent − spend`) and document-status logic with `apps/web` and the backend.
