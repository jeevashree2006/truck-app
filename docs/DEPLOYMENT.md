# Deployment Guide — Lorry Kanakku (100% free)

Three pieces, each on a free-forever host:

| Layer | Host | Cost | Notes |
|---|---|---|---|
| **Database** (MySQL) | **TiDB Cloud Serverless** | Free forever (25 GB) | MySQL-compatible, requires TLS (`DB_SSL=true`) |
| **API** (FastAPI, `apps/api`) | **Render** (Docker) | Free | Spins down when idle → ~50 s cold start; keep warm with a free pinger |
| **Web** (Vite, `apps/web`) | **Vercel** | Free forever | Static build |

`$` = run in a terminal · **→** = click in the browser. Repo: `github.com/jeevashree2006/truck-app`.

---

## 1 · Database — TiDB Cloud Serverless (free MySQL)

1. **→** [tidbcloud.com](https://tidbcloud.com) → sign up → **Create Cluster → Serverless** (free) → create.
2. **→** **Connect** → set/copy a password → note **Host**, **Port (4000)**, **User**, **Password**, and **Database** (create one called `fleet`, or use `test`).
3. Build your connection string (used as `DATABASE_URL`):
   ```
   mysql+asyncmy://<user>:<password>@<host>:4000/fleet
   ```
   TiDB requires TLS → you'll set `DB_SSL=true` on the API (step 2).

> Alternative free MySQL: **Aiven for MySQL** (free plan) — same idea, also needs `DB_SSL=true`.

---

## 2 · API — Render (free, from the Dockerfile)

Generate a JWT secret and grab your email password first:
```bash
$ python3 -c "import secrets; print(secrets.token_urlsafe(48))"      # → JWT_SECRET
$ grep SMTP_PASSWORD apps/api/.env                                   # → SMTP_PASSWORD
```

1. **→** [render.com](https://render.com) → **New → Web Service** → connect the GitHub repo → pick **truck-app**.
2. **Branch:** `mysql-migration` (or `main` after you merge) · **Root Directory:** `apps/api` · **Runtime:** Docker (auto-detected from `apps/api/Dockerfile`). Instance type: **Free**.
3. **Environment variables:**
   ```
   ENV            = production
   DATABASE_URL   = mysql+asyncmy://<user>:<pass>@<host>:4000/fleet   # from step 1
   DB_SSL         = true
   JWT_SECRET     = <token_urlsafe output>
   SMTP_USER      = truckapp02@gmail.com
   SMTP_PASSWORD  = <16-char Gmail App Password, no spaces>
   EMAIL_FROM     = truckapp02@gmail.com
   CORS_ORIGINS   = capacitor://localhost,http://localhost,https://localhost
   ```
   > Any `https://*.vercel.app` origin is already allowed by a regex in the API, so you don't list the Vercel URL. Add a custom web domain to `CORS_ORIGINS` if you use one.
4. Deploy → you get e.g. `https://lorry-kanakku-api.onrender.com`.
5. Verify: `curl https://<that-url>/health` → `{"db":"up"}` and open `/docs`.
6. (Optional) seed demo data: Render shell → `python seed_demo.py`.
7. **Keep it awake** (free instances sleep): add the URL to a free **UptimeRobot** / **cron-job.org** ping every ~10 min.

---

## 3 · Web — Vercel (free)

1. **→** [vercel.com](https://vercel.com) → **Add New → Project** → import **truck-app**.
2. **Root Directory:** `apps/web` · Framework: **Vite** (auto) · Branch: `mysql-migration` (or `main`).
3. **Environment variables:**
   ```
   VITE_USE_MOCKS = false
   VITE_API_URL   = https://<your-render-url>      # step 2, no trailing slash
   ```
4. **Deploy** → `https://your-app.vercel.app`. (`vercel.json` already handles SPA routing.)
5. Test: open the site → sign up → a real OTP email arrives → log in.

That's it — **web + API + MySQL, all free.**

---

## Mobile (optional) — Android + iOS via Capacitor

The same `apps/web` build wraps into native apps (build is free; store fees: Play **$25** once, Apple **$99/yr**).
```bash
cd apps/web
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
npx cap init "Lorry Kanakku" "app.lorrykanakku.mobile" --web-dir=dist
VITE_USE_MOCKS=false VITE_API_URL=https://<render-url> npm run build
npx cap add android && npx cap add ios && npx cap sync
npx cap open android   # build a signed .aab → Play Console
npx cap open ios       # Xcode → Archive → App Store (Mac only)
```
The API's `CORS_ORIGINS` already includes the `capacitor://localhost` / `localhost` origins the apps use.

---

## Env var reference
- **API (Render):** `ENV`, `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `CORS_ORIGINS`
- **Web (Vercel) + Capacitor build:** `VITE_USE_MOCKS=false`, `VITE_API_URL=<render url>`

## Secrets
`apps/api/.env` and `apps/web/.env` are git-ignored. The Gmail App Password lives only in your local `.env` and the host's env vars — never in the repo. Rotate it at <https://myaccount.google.com/apppasswords> if leaked.
