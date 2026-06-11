# Fleet Owner API (FastAPI + MongoDB)

OTP auth (mobile **or** email), vehicles + documents, multi-leg **loads** with profit,
repairs, profit analytics, and PDF/CSV reports.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate    # Python 3.11+
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload                        # http://localhost:8000/docs
python seed_demo.py                                  # optional demo data
```

No Mongo locally → set `MONGODB_URI` to a MongoDB Atlas M0 cluster.
No SendGrid/SMS keys → OTP codes are logged to the console and returned by the API in dev mode.

## Layout

```
app/
├── main.py              FastAPI app, CORS, router wiring, /health, /reference
├── core/                config, security (JWT + OTP hashing), deps (auth)
├── db/mongo.py          Motor client + index creation
├── models/              enums, mongo helpers
├── schemas/             Pydantic request/response models
├── services/            status, loads (profit), analytics, reminders, reports, email/SMS, otp_store
└── routers/             auth, users, vehicles, loads, repairs, analytics, notifications, reports
```

## Profit logic — `app/services/loads.py`

```
leg.spend   = diesel + commission + driver_salary + fastag
leg.profit  = total_rent − spend
totals.spend / totals.profit = sum across legs
expected_driver_balance = total_advance − (total_diesel + total_fastag)
```
Advances are floated cash, excluded from spend. Pure & unit-testable (no DB).

See [../../docs/API.md](../../docs/API.md) for the full endpoint reference.

> Note: the codebase uses PEP 604 (`X | None`) annotations evaluated at runtime, so it
> requires **Python 3.11+** (the Docker image uses 3.12).
