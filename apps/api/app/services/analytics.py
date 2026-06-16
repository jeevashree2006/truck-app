"""Aggregation helpers for the profit dashboard and per-vehicle profit reports."""

from collections import defaultdict
from datetime import date

from app.db.sql import Database
from app.models.enums import VehicleStatus
from app.services.loads import compute_totals, route_summary
from app.services.status import build_document_statuses

_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_STATUS_LABELS = {
    "empty": "Empty",
    "on_the_way": "On the way",
    "waiting_for_unload": "Waiting to unload",
    "maintenance": "Maintenance",
}
_SPEND_LABELS = {"diesel": "Diesel", "commission": "Commission", "salary": "Driver Salary", "fastag": "FASTag"}


def _d(value) -> date | None:
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _last_n_months(n: int, today: date) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append((f"{y:04d}-{m:02d}", _MONTH_LABELS[m - 1]))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))


def _load_date(load: dict) -> date | None:
    return _d(load.get("end_date")) or _d(load.get("start_date")) or _d(load.get("created_at"))


async def build_dashboard(db: Database, owner_id: str, today: date, months: int = 6) -> dict:
    vehicles = await db.vehicles.find({"owner_id": owner_id}).to_list(length=5000)
    loads = await db.loads.find({"owner_id": owner_id}).to_list(length=20000)

    reg_by_id = {v["id"]: v.get("registration_number", "") for v in vehicles}
    body_by_id = {v["id"]: v.get("body_type") for v in vehicles}
    status_by_id = {v["id"]: v.get("status", "empty") for v in vehicles}

    # Monthly profit series (completed trips only).
    series = _last_n_months(months, today)
    monthly = {k: {"rent": 0.0, "spend": 0.0, "profit": 0.0, "trips": 0} for k, _ in series}
    per_vehicle: dict[str, dict] = defaultdict(lambda: {"rent": 0.0, "spend": 0.0, "profit": 0.0, "trips": 0})
    spend_totals = {"diesel": 0.0, "commission": 0.0, "salary": 0.0, "fastag": 0.0}
    profit_all_time = 0.0

    for load in loads:
        totals = compute_totals(load.get("legs") or [])
        if load.get("status") == "completed":
            profit_all_time += totals["profit"]
            vid = load.get("vehicle_id")
            pv = per_vehicle[vid]
            pv["rent"] += totals["total_rent"]
            pv["spend"] += totals["spend"]
            pv["profit"] += totals["profit"]
            pv["trips"] += 1
            spend_totals["diesel"] += totals["total_diesel"]
            spend_totals["commission"] += totals["total_commission"]
            spend_totals["salary"] += totals["total_salary"]
            spend_totals["fastag"] += totals["total_fastag"]
            d = _load_date(load)
            if d and (mk := _month_key(d)) in monthly:
                monthly[mk]["rent"] += totals["total_rent"]
                monthly[mk]["spend"] += totals["spend"]
                monthly[mk]["profit"] += totals["profit"]
                monthly[mk]["trips"] += 1

    monthly_points = [
        {
            "month": k,
            "label": label,
            "rent": round(monthly[k]["rent"], 2),
            "spend": round(monthly[k]["spend"], 2),
            "profit": round(monthly[k]["profit"], 2),
            "trips": monthly[k]["trips"],
        }
        for k, label in series
    ]

    total_spend = sum(spend_totals.values()) or 1.0
    spend_breakdown = [
        {
            "category": cat,
            "label": _SPEND_LABELS[cat],
            "amount": round(amt, 2),
            "percentage": round(amt / total_spend * 100, 1),
        }
        for cat, amt in sorted(spend_totals.items(), key=lambda kv: kv[1], reverse=True)
        if amt > 0
    ]

    # Status breakdown.
    status_counts: dict[str, int] = defaultdict(int)
    for v in vehicles:
        status_counts[v.get("status", "empty")] += 1
    status_breakdown = [
        {"status": s, "label": _STATUS_LABELS.get(s, s.title()), "count": c} for s, c in status_counts.items()
    ]

    top_vehicles = sorted(
        (
            {
                "vehicle_id": vid,
                "registration_number": reg_by_id.get(vid, ""),
                "body_type": body_by_id.get(vid),
                "status": status_by_id.get(vid, "empty"),
                "trips_count": pv["trips"],
                "total_rent": round(pv["rent"], 2),
                "total_spend": round(pv["spend"], 2),
                "total_profit": round(pv["profit"], 2),
                "avg_profit": round(pv["profit"] / pv["trips"], 2) if pv["trips"] else 0.0,
            }
            for vid, pv in per_vehicle.items()
        ),
        key=lambda x: x["total_profit"],
        reverse=True,
    )

    this_month = _month_key(today)
    cur = next((p for p in monthly_points if p["month"] == this_month), None)

    docs_expiring = 0
    for v in vehicles:
        rows, _ = build_document_statuses(v.get("documents"))
        docs_expiring += sum(1 for r in rows if r["status"] in ("expiring", "expired"))

    kpis = {
        "total_vehicles": len(vehicles),
        "vehicles_on_way": sum(1 for v in vehicles if v.get("status") == VehicleStatus.on_the_way.value),
        "vehicles_empty": sum(1 for v in vehicles if v.get("status", "empty") == VehicleStatus.empty.value),
        "vehicles_waiting": sum(1 for v in vehicles if v.get("status") == VehicleStatus.waiting_for_unload.value),
        "active_loads": sum(1 for l in loads if l.get("status") == "ongoing"),
        "trips_this_month": cur["trips"] if cur else 0,
        "rent_this_month": cur["rent"] if cur else 0.0,
        "spend_this_month": cur["spend"] if cur else 0.0,
        "profit_this_month": cur["profit"] if cur else 0.0,
        "profit_all_time": round(profit_all_time, 2),
        "documents_expiring": docs_expiring,
    }

    return {
        "kpis": kpis,
        "monthly": monthly_points,
        "spend_breakdown": spend_breakdown,
        "status_breakdown": status_breakdown,
        "top_vehicles": top_vehicles[:6],
    }


async def vehicle_profit_list(db: Database, owner_id: str) -> list[dict]:
    """Per-vehicle profit summary across all completed trips."""
    dash = await build_dashboard(db, owner_id, date.today(), months=12)
    summary = {v["vehicle_id"]: v for v in dash["top_vehicles"]}
    vehicles = await db.vehicles.find({"owner_id": owner_id}).sort("created_at", -1).to_list(length=5000)
    out = []
    for v in vehicles:
        vid = v["id"]
        s = summary.get(vid)
        out.append(
            s
            or {
                "vehicle_id": vid,
                "registration_number": v.get("registration_number", ""),
                "body_type": v.get("body_type"),
                "status": v.get("status", "empty"),
                "trips_count": 0,
                "total_rent": 0.0,
                "total_spend": 0.0,
                "total_profit": 0.0,
                "avg_profit": 0.0,
            }
        )
    return out


async def trips_for_vehicle(db: Database, owner_id: str, vehicle_id: str) -> list[dict]:
    loads = (
        await db.loads.find({"owner_id": owner_id, "vehicle_id": vehicle_id})
        .sort("created_at", -1)
        .to_list(length=5000)
    )
    rows = []
    for load in loads:
        totals = compute_totals(load.get("legs") or [])
        rows.append(
            {
                "load_id": load["id"],
                "route": route_summary(load.get("legs") or []) or "—",
                "status": load.get("status", "ongoing"),
                "start_date": str(_d(load.get("start_date"))) if load.get("start_date") else None,
                "end_date": str(_d(load.get("end_date"))) if load.get("end_date") else None,
                "rent": totals["total_rent"],
                "spend": totals["spend"],
                "profit": totals["profit"],
            }
        )
    return rows
