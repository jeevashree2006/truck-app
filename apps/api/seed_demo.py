"""Seed the database with a demo owner + realistic lorry/load data.

Usage (with the MySQL connection configured in .env or env):
    python seed_demo.py

Prints a demo mobile + email you can sign in with (request an OTP; dev mode returns
the code). Safe to re-run: it wipes and recreates the demo owner's data only.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone

from app.db.sql import Database, async_session, dispose_db, init_db

DEMO_MOBILE = "9000000001"
DEMO_EMAIL = "owner@demo.fleet"


def days_from_now(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def leg(frm, to, rent, commission, salary, fastag, diesel, advance):
    return {
        "loading_point": frm,
        "unloading_point": to,
        "total_rent": rent,
        "commission": commission,
        "driver_salary": salary,
        "fastag": fastag,
        "diesel": [{"amount": a, "note": "Fill", "at": days_from_now(-d)} for a, d in diesel],
        "advance": [{"amount": a, "note": "Advance", "at": days_from_now(-d)} for a, d in advance],
    }


async def main() -> None:
    await init_db()
    session = async_session()
    db = Database(session)
    now = datetime.now(timezone.utc)

    user = await db.users.find_one({"mobile": DEMO_MOBILE})
    if user is None:
        res = await db.users.insert_one(
            {"name": "Demo Owner", "mobile": DEMO_MOBILE, "email": DEMO_EMAIL, "language": "en",
             "theme": "system", "push_tokens": [], "created_at": now}
        )
        owner_id = res.inserted_id
    else:
        owner_id = user["id"]

    for coll in (db.vehicles, db.loads, db.repairs, db.notifications):
        await coll.delete_many({"owner_id": owner_id})

    fleet = [
        {"reg": "TN28AB1234", "axle": "multi", "feet": 32, "body": "container", "age": 3, "make": "Tata",
         "model": "BS6", "docs": {"rc": 900, "ddc": 300, "insurance": 18, "fitness": 120, "permit": -5,
                                  "road_tax": 400, "puc": 9}},
        {"reg": "TN29CD5678", "axle": "single", "feet": 20, "body": "open", "age": 5, "make": "Ashok Leyland",
         "model": "BS4", "docs": {"rc": 1100, "ddc": 500, "insurance": 210, "fitness": 45, "permit": 300,
                                  "road_tax": 60, "puc": 170}},
        {"reg": "TN30EF9012", "axle": "multi", "feet": 32, "body": "trailer", "age": 2, "make": "BharatBenz",
         "model": "BS6", "docs": {"rc": 1400, "ddc": 700, "insurance": 95, "fitness": 260, "permit": 25,
                                  "road_tax": 500, "puc": -12}},
    ]

    vehicle_ids = []
    for v in fleet:
        documents = {
            t: {"number": f"{t.upper()}-{v['reg'][-4:]}", "issue_date": days_from_now(-365), "expiry_date": days_from_now(exp)}
            for t, exp in v["docs"].items()
        }
        mfg = date(date.today().year - v["age"], 6, 1).strftime("%Y-%m")
        res = await db.vehicles.insert_one(
            {"owner_id": owner_id, "registration_number": v["reg"], "axle_type": v["axle"],
             "length_feet": v["feet"], "body_type": v["body"], "manufacture_month": mfg,
             "age_years": v["age"], "make": v["make"],
             "model": v["model"], "chassis_number": "CHS" + v["reg"][-4:], "photo_url": None,
             "documents": documents, "status": "empty", "active_load_id": None,
             "created_at": now, "updated_at": now}
        )
        vehicle_ids.append((res.inserted_id, v["reg"]))

    # Completed multi-leg loads (with profit) across recent months.
    sample_loads = [
        # (vehicle index, [legs], days_ago_start, days_ago_end)
        (0, [leg("Namakkal", "Mumbai", 95000, 4000, 8000, 2200, [(18000, 30), (16000, 27)], [(40000, 31)]),
             leg("Mumbai", "Madurai", 88000, 3500, 7500, 1900, [(17000, 24), (15000, 22)], [(35000, 25)])], 32, 22),
        (1, [leg("Chennai", "Bangalore", 32000, 1500, 3000, 800, [(9000, 18)], [(12000, 19)])], 18, 16),
        (2, [leg("Tuticorin", "Delhi", 165000, 7000, 14000, 4200, [(30000, 12), (28000, 9), (26000, 6)], [(70000, 13)]),
             leg("Delhi", "Coimbatore", 158000, 6800, 13500, 4000, [(29000, 5), (27000, 3)], [(65000, 6)])], 13, 2),
        (0, [leg("Salem", "Hyderabad", 52000, 2200, 5000, 1400, [(14000, 48)], [(20000, 49)])], 50, 46),
        (1, [leg("Erode", "Kochi", 28000, 1200, 2800, 700, [(8000, 60)], [(10000, 61)])], 62, 60),
    ]
    base_km = 100000
    for vidx, legs, ds, de in sample_loads:
        vid, _ = vehicle_ids[vidx]
        # Odometer + fuel so each closed trip has a realistic mileage (km/litre).
        rent = sum(l["total_rent"] for l in legs)
        diesel = sum(e["amount"] for l in legs for e in l.get("diesel", []))
        km = round(rent / 75)                     # rent ≈ distance proxy
        litres = round(diesel / 95) or 1          # diesel ₹ / ~95 ₹ per litre
        start_km, end_km = base_km, base_km + km
        base_km = end_km + 1500
        await db.loads.insert_one(
            {"owner_id": owner_id, "vehicle_id": vid, "status": "completed",
             "start_date": days_from_now(-ds), "end_date": days_from_now(-de), "notes": None,
             "legs": legs, "accounts_image_url": None, "driver_balance": 5000,
             "start_km": float(start_km), "end_km": float(end_km), "fuel_litres": float(litres),
             "created_at": now - timedelta(days=ds), "closed_at": now - timedelta(days=de)}
        )

    # One ongoing load → its vehicle is "on the way".
    vid0, _ = vehicle_ids[0]
    ongoing = await db.loads.insert_one(
        {"owner_id": owner_id, "vehicle_id": vid0, "status": "ongoing",
         "start_date": days_from_now(-2), "end_date": None, "notes": "In transit",
         "legs": [leg("Namakkal", "Pune", 78000, 3200, 7000, 1800, [(16000, 1)], [(30000, 2)])],
         "accounts_image_url": None, "driver_balance": None,
         "created_at": now, "closed_at": None}
    )
    await db.vehicles.update_one(
        {"id": vid0},
        {"$set": {"status": "on_the_way", "active_load_id": ongoing.inserted_id}},
    )

    # A couple of repairs.
    for i, (vid, _reg) in enumerate(vehicle_ids[:2]):
        await db.repairs.insert_one(
            {"owner_id": owner_id, "vehicle_id": vid, "date": days_from_now(-20 - i * 10),
             "description": "Brake pad + clutch plate replacement", "amount": 8500 + i * 2000,
             "vendor": "Sri Lakshmi Motors", "odometer_km": None, "created_at": now}
        )

    print("Seeded demo fleet.")
    print(f"  Owner mobile : {DEMO_MOBILE}")
    print(f"  Owner email  : {DEMO_EMAIL}")
    print(f"  Vehicles     : {len(vehicle_ids)}  Loads: {len(sample_loads) + 1}")
    print("Sign in by requesting an OTP for the mobile or email (dev mode returns the code).")
    await session.commit()
    await session.close()
    await dispose_db()


if __name__ == "__main__":
    asyncio.run(main())
