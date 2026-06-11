# Deployment Guide — Fleet Owner

Ship **one web codebase** to **web + Android + iOS**.

```
                 ┌─────────────────────────┐
                 │  apps/api  (FastAPI)     │  ← Railway / Render (Docker)
                 │  + MongoDB Atlas (M0)    │
                 └───────────▲─────────────┘
                             │  HTTPS  /api/v1/*
        ┌────────────────────┼────────────────────┐
        │                    │                     │
  ┌─────┴───────┐     ┌──────┴───────┐      ┌──────┴───────┐
  │ Web (Vercel) │    │ Android app   │      │ iOS app       │
  │ apps/web     │    │ Capacitor +   │      │ Capacitor +   │
  │              │    │ apps/web/dist │      │ apps/web/dist │
  └──────────────┘    └───────────────┘      └───────────────┘
```

Android/iOS are **Capacitor wrappers around the built web app** (`apps/web/dist`). They bundle the web
UI and call the same hosted API over HTTPS — **one codebase, three targets**.

> The old `apps/mobile` Expo app is **retired**: it's feature-behind (no freight payments, no BS
> model dropdown, old profit formula) and keeping it means maintaining everything twice.

| Component | Target | Cost |
|-----------|--------|------|
| Database | **MongoDB Atlas** M0 | Free |
| Backend (FastAPI) | **Railway** (or Render) — Docker | ~$5/mo (Railway) / free (Render, sleeps) |
| Web dashboard | **Vercel** (Vite) | Free |
| Android | **Capacitor → .aab →** Play Store | $25 once |
| iOS | **Capacitor → Xcode →** App Store | $99/yr |

**Local tooling:** Node 18+, Android Studio (Android), Xcode + CocoaPods (iOS — Mac only).

---

## Phase 1 — Database (MongoDB Atlas)

1. Create a free **M0 cluster** at <https://cloud.mongodb.com>.
2. **Database Access** → add a user (username + strong password).
3. **Network Access** → allow `0.0.0.0/0` (host IPs are dynamic).
4. **Connect → Drivers** → copy the string → this is `MONGODB_URI`.
   The app auto-creates collections + indexes on first boot.

---

## Phase 2 — API (Railway, or Render)

`apps/api/Dockerfile` is ready and respects `$PORT`. CORS is env-driven.

1. **New Project → Deploy from GitHub** → pick this repo.
2. **Root directory:** `apps/api` (the Dockerfile is auto-detected).
3. Add **Variables** (see `apps/api/.env.example` for the full list):
   ```
   ENV            = production
   MONGODB_URI    = mongodb+srv://...            # from Phase 1
   MONGODB_DB     = fleet
   JWT_SECRET     = <python -c "import secrets;print(secrets.token_urlsafe(48))">
   SMTP_USER      = truckapp02@gmail.com
   SMTP_PASSWORD  = <16-char Gmail App Password, no spaces>
   EMAIL_FROM     = truckapp02@gmail.com
   CORS_ORIGINS   = capacitor://localhost,http://localhost,https://localhost
   ```
   > **CORS note:** any `https://*.vercel.app` origin is already allowed by a regex in the API, so you
   > don't need to list the Vercel URL. You **do** need the three `localhost` origins above — those are
   > what the Capacitor Android/iOS apps use. For a custom web domain, add it to `CORS_ORIGINS` too.
4. Deploy → you get a public URL, e.g. `https://fleet-api-production.up.railway.app`.
5. Verify: `curl https://<url>/health` → `{"db":"up"}`, and `https://<url>/docs` loads Swagger.
6. (Optional) seed demo data: run `python seed_demo.py` from a shell with the same env.

---

## Phase 3 — Web (Vercel)

1. **Add New → Project** → import this repo.
2. **Root Directory:** `apps/web`. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. **Environment Variables:**
   ```
   VITE_USE_MOCKS = false
   VITE_API_URL   = https://<your-railway-url>     # Phase 2, no trailing slash
   ```
4. Deploy → `https://YOUR-WEB.vercel.app`. (`vercel.json` already handles SPA routing.)
5. Smoke test: sign up → confirm a real OTP email arrives → log in.

---

## Phase 4 — Android + iOS (Capacitor)

All commands run in `apps/web`.

**One-time setup**
```bash
cd apps/web
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/ios
npx cap init "Fleet Owner" "app.fleetowner.mobile" --web-dir=dist
```
> `app.fleetowner.mobile` is the bundle/app ID — change it to your own reverse-domain
> (e.g. `com.yourname.fleetowner`) before publishing; it can't change after store release.

**Build the web against the PRODUCTION api, then add platforms**
```bash
VITE_USE_MOCKS=false VITE_API_URL=https://<your-railway-url> npm run build
npx cap add android
npx cap add ios
npx cap sync
```
> After **any** web change, re-run the `npm run build` line + `npx cap sync` to refresh the
> native bundles.

**Android → Play Store**
```bash
npx cap open android        # Android Studio
```
- Build → *Generate Signed Bundle / APK* → **Android App Bundle (.aab)** → create a keystore (back it up!).
- Upload the `.aab` in Play Console → fill the listing → submit for review.

**iOS → App Store** (Mac + Xcode)
```bash
cd ios/App && pod install && cd -
npx cap open ios            # Xcode
```
- *Signing & Capabilities* → select your **Team** (Apple Developer account).
- Product → Archive → distribute to **App Store Connect** → submit for review.

---

## Notifications & scheduled jobs (optional, already wired)

- **Email OTP** uses Gmail SMTP (set `SMTP_USER` + `SMTP_PASSWORD`). Falls back to console in dev.
- **Daily document-expiry summary:** schedule a daily `POST /api/v1/notifications/daily-summary/send`
  (Railway Cron / GitHub Action / cron-job.org) to email owners about expiring docs.

---

## Secrets — never commit these

`apps/api/.env` and `apps/web/.env` are git-ignored (verified). The Gmail App Password lives **only** in
your local `apps/api/.env` and the host's Variables. If it's ever leaked, rotate it at
<https://myaccount.google.com/apppasswords>.

## Env var quick reference

- **API (Railway/Render):** `ENV`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `SMTP_USER`,
  `SMTP_PASSWORD`, `EMAIL_FROM`, `CORS_ORIGINS`
- **Web (Vercel) + Capacitor build:** `VITE_USE_MOCKS=false`, `VITE_API_URL=<api url>`

## Health & smoke test

```bash
curl https://<api-url>/health      # {"db":"up", ...}
```
