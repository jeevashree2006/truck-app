# Deploy the API on Oracle Cloud Always Free (with your own Gmail SMTP)

Why: free hosts like Render block outbound SMTP, so Gmail OTP email can't send from them.
An Oracle **Always Free** VM leaves port **587 open**, so your Gmail SMTP works — at $0 forever.

Only the **API** moves here. **TiDB** (database) and **Vercel** (web) stay exactly as they are.

```
Browser ──HTTPS──> your-sub.duckdns.org  (Caddy, auto TLS)  ──> FastAPI ──587──> Gmail SMTP
                                                                   └──TLS──> TiDB
```

`→` = click in the browser · `$` = run in the VM's SSH terminal.

---

## Phase A — Create the Always Free VM
1. → [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) → **Start for free** → sign up.
   (A card is required to verify identity; **Always Free resources are never charged**. Pick your
   **Home Region** carefully — it's permanent.)
2. → Console → **Menu → Compute → Instances → Create instance**.
   - **Image:** Canonical **Ubuntu 22.04**
   - **Shape:** **Change shape → Specialty/previous → VM.Standard.E2.1.Micro** (AMD, *Always Free-eligible*).
     *(The Ampere A1 ARM shape is also free but often "out of capacity"; the AMD micro is reliable.)*
   - **SSH keys:** **Save private key** (download the `.key` file) and **Save public key**.
   - **Create.** Wait until it's **Running**, then copy the **Public IP address**.

## Phase B — Open the firewall (VCN)
1. On the instance page → **Virtual cloud network** link → **Security Lists** → the default list.
2. **Add Ingress Rules** (twice):
   - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **80**
   - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **443**
3. Save. *(The `setup.sh` script opens the VM's own firewall in Phase D.)*

## Phase C — Free HTTPS domain (DuckDNS)
1. → [duckdns.org](https://www.duckdns.org) → sign in (GitHub/Google).
2. Type a subdomain (e.g. `lorrykanakku`) → **add domain**.
3. In its **current ip** box, paste your VM's **Public IP** → **update ip**.
   Your API URL will be `https://lorrykanakku.duckdns.org`.

## Phase D — Connect & prepare the VM
From your Mac terminal (use the key you downloaded):
```
$ chmod 600 ~/Downloads/your-key.key
$ ssh -i ~/Downloads/your-key.key ubuntu@<PUBLIC_IP>
```
On the VM:
```
$ sudo apt-get update -y && sudo apt-get install -y git
$ git clone https://github.com/jeevashree2006/truck-app.git
$ cd truck-app/deploy/oracle
$ bash setup.sh          # installs Docker, adds swap, opens host firewall
$ exit                   # log out/in so Docker works without sudo
```

## Phase E — Configure & launch
SSH back in, then:
```
$ cd truck-app/deploy/oracle
$ cp .env.example .env
$ nano .env              # fill DOMAIN, DATABASE_URL, JWT_SECRET, SMTP_* (see notes below)
$ docker compose up -d --build
```
Fill `.env` with:
- **DOMAIN** = your `*.duckdns.org`
- **DATABASE_URL** + **DB_SSL=true** = copy from your Render service's env (same TiDB)
- **JWT_SECRET** = the **same** value you used on Render
- **SMTP_USER / SMTP_PASSWORD / EMAIL_FROM** = your Gmail + 16-char App Password

Check it's up (Caddy needs ~30s to get the cert the first time):
```
$ docker compose logs -f caddy   # look for "certificate obtained successfully"
$ curl https://<your-sub>.duckdns.org/health     # -> {"status":"ok","db":"up"}
```

## Phase F — Point the web app at the new API
→ Vercel → your project → **Settings → Environment Variables**:
- Change **`VITE_API_URL`** to `https://<your-sub>.duckdns.org`
→ **Deployments → Redeploy** (so the new URL is baked into the build).

## Phase G — Test
Open your Vercel site → **Sign up** with a real email → the OTP now arrives **from your Gmail** →
log in. 🎉  You can now retire the Render service.

---

### Day-2 notes
- **Update after a code change:** `git pull && docker compose up -d --build`
- **Logs:** `docker compose logs -f api`
- **DuckDNS IP:** the VM's public IP is static (reserved) by default, so DuckDNS won't drift.
- **Keep-alive:** unlike Render free, the VM never sleeps — no cold starts.
