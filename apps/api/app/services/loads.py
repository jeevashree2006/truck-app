"""Pure profit/accounting logic for loads (multi-leg trips).

Profit model (confirmed with the owner):
    spend  = diesel + commission + driver_salary + fastag + advance   (per leg, summed)
    profit = total_rent - spend
Advances ARE counted as spend (the owner's decision). The driver-balance figure is a
separate reconciliation of the cash the driver should return.
"""

from app.models.common import serialize_doc


def _sum_entries(entries) -> float:
    return float(sum(float(e.get("amount") or 0) for e in (entries or [])))


def compute_leg(leg: dict) -> dict:
    """Return the leg with per-leg computed totals (diesel_total, spend, profit, freight...)."""
    diesel_total = _sum_entries(leg.get("diesel"))
    advance_total = _sum_entries(leg.get("advance"))
    commission = float(leg.get("commission") or 0)
    salary = float(leg.get("driver_salary") or 0)
    fastag = float(leg.get("fastag") or 0)
    rent = float(leg.get("total_rent") or 0)
    # Spend = every cost on the leg EXCEPT the rent (diesel + commission + salary + fastag + advance).
    spend = diesel_total + commission + salary + fastag + advance_total
    freight_received = _sum_entries(leg.get("freight_payments"))
    freight_pending = max(0.0, rent - freight_received)
    out = dict(leg)
    out.setdefault("freight_payments", [])
    out.update(
        {
            "diesel_total": round(diesel_total, 2),
            "advance_total": round(advance_total, 2),
            "spend": round(spend, 2),
            "profit": round(rent - spend, 2),
            "freight_received": round(freight_received, 2),
            "freight_pending": round(freight_pending, 2),
            "freight_fully_paid": rent > 0 and freight_received >= rent - 0.01,
        }
    )
    return out


def compute_totals(legs: list[dict], driver_balance: float | None = None) -> dict:
    """Aggregate computed legs into trip-level totals (freight is summed per leg)."""
    computed = [compute_leg(l) for l in legs]
    total_rent = sum(float(l.get("total_rent") or 0) for l in computed)
    total_diesel = sum(l["diesel_total"] for l in computed)
    total_commission = sum(float(l.get("commission") or 0) for l in computed)
    total_salary = sum(float(l.get("driver_salary") or 0) for l in computed)
    total_fastag = sum(float(l.get("fastag") or 0) for l in computed)
    total_advance = sum(l["advance_total"] for l in computed)
    # Spend includes the driver advance now (every cost except the rent).
    spend = total_diesel + total_commission + total_salary + total_fastag + total_advance
    profit = total_rent - spend
    # Driver settlement: of the advance floated, the cash a driver typically spends is
    # diesel + fastag; the rest should come back. Owners can override via driver_balance.
    expected_balance = max(0.0, total_advance - (total_diesel + total_fastag))
    # Freight is per leg (each leg paid by its own transporter), so received/pending are
    # summed per leg — an overpayment on one leg must NOT cancel a shortfall on another.
    # "Fully paid" therefore means no leg is still owed (pending == 0), not just that the
    # total collected reached the total rent.
    freight_received = sum(l["freight_received"] for l in computed)
    freight_pending = sum(l["freight_pending"] for l in computed)
    return {
        "total_rent": round(total_rent, 2),
        "total_diesel": round(total_diesel, 2),
        "total_commission": round(total_commission, 2),
        "total_salary": round(total_salary, 2),
        "total_fastag": round(total_fastag, 2),
        "total_advance": round(total_advance, 2),
        "spend": round(spend, 2),
        "profit": round(profit, 2),
        "leg_count": len(computed),
        "expected_driver_balance": round(expected_balance, 2),
        "freight_received": round(freight_received, 2),
        "freight_pending": round(freight_pending, 2),
        "freight_fully_paid": total_rent > 0 and freight_pending <= 0.01,
    }


def route_summary(legs: list[dict]) -> str:
    """Build 'A → B → C' from the legs (de-duplicating shared hand-off points)."""
    points: list[str] = []
    for leg in legs:
        start = (leg.get("loading_point") or "").strip()
        end = (leg.get("unloading_point") or "").strip()
        if start and (not points or points[-1] != start):
            points.append(start)
        if end and (not points or points[-1] != end):
            points.append(end)
    return " → ".join(points)


def trip_mileage(start_km, end_km, fuel_litres) -> float | None:
    """km per litre for the trip = (end_km - start_km) / fuel_litres, when all are valid."""
    try:
        sk, ek, fl = float(start_km), float(end_km), float(fuel_litres)
    except (TypeError, ValueError):
        return None
    if fl <= 0 or ek <= sk:
        return None
    return round((ek - sk) / fl, 2)


def serialize_load(doc: dict) -> dict:
    """Convert a raw load document into the enriched API shape."""
    load = serialize_doc(doc)
    legs = load.get("legs") or []
    computed_legs = [compute_leg(l) for l in legs]
    load["legs"] = computed_legs
    load["totals"] = compute_totals(legs, load.get("driver_balance"))
    load["route"] = route_summary(legs)
    load["mileage"] = trip_mileage(load.get("start_km"), load.get("end_km"), load.get("fuel_litres"))
    return load
