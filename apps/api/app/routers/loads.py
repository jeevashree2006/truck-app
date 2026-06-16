from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbDep
from app.models.common import to_mongo
from app.models.enums import TripStatus, VehicleStatus
from app.schemas.common import Message
from app.schemas.load import CloseTrip, LoadCreate, LoadOut, LoadUpdate
from app.services.loads import serialize_load
from app.services.lookup import owned_vehicle_or_none, vehicle_registration_map

router = APIRouter(prefix="/loads", tags=["loads"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _owned_load(db: DbDep, owner_id: str, load_id: str) -> dict:
    doc = await db.loads.find_one({"id": load_id, "owner_id": owner_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Load not found")
    return doc


def _out(doc: dict, reg: str | None) -> LoadOut:
    load = serialize_load(doc)
    load["vehicle_registration"] = reg
    return LoadOut(**load)


@router.get("", response_model=list[LoadOut])
async def list_loads(
    current: CurrentUser,
    db: DbDep,
    vehicle_id: str | None = Query(default=None),
    status_filter: TripStatus | None = Query(default=None, alias="status"),
):
    query: dict = {"owner_id": current["id"]}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if status_filter:
        query["status"] = status_filter.value
    docs = await db.loads.find(query).sort("created_at", -1).to_list(length=5000)
    reg_map = await vehicle_registration_map(db, current["id"])
    return [_out(d, reg_map.get(d.get("vehicle_id"))) for d in docs]


@router.post("", response_model=LoadOut, status_code=status.HTTP_201_CREATED)
async def create_load(payload: LoadCreate, current: CurrentUser, db: DbDep):
    vehicle = await owned_vehicle_or_none(db, current["id"], payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    legs = payload.legs or [
        {"loading_point": "", "unloading_point": "", "total_rent": 0, "commission": 0,
         "driver_salary": 0, "fastag": 0, "diesel": [], "advance": [], "freight_payments": []}
    ]
    doc = to_mongo(
        {
            "owner_id": current["id"],
            "vehicle_id": payload.vehicle_id,
            "status": TripStatus.ongoing.value,
            "start_date": payload.start_date,
            "end_date": None,
            "notes": payload.notes,
            "legs": [l if isinstance(l, dict) else l.model_dump() for l in legs],
            "accounts_image_url": None,
            "driver_balance": None,
            "created_at": _now(),
            "closed_at": None,
        }
    )
    result = await db.loads.insert_one(doc)
    load_id = str(result.inserted_id)

    # An active load puts the vehicle "on the way".
    await db.vehicles.update_one(
        {"id": payload.vehicle_id},
        {"$set": {"status": VehicleStatus.on_the_way.value, "active_load_id": load_id, "updated_at": _now()}},
    )

    created = await db.loads.find_one({"id": result.inserted_id})
    return _out(created, vehicle.get("registration_number"))


@router.get("/{load_id}", response_model=LoadOut)
async def get_load(load_id: str, current: CurrentUser, db: DbDep):
    doc = await _owned_load(db, current["id"], load_id)
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(doc, reg_map.get(doc.get("vehicle_id")))


@router.patch("/{load_id}", response_model=LoadOut)
async def update_load(load_id: str, payload: LoadUpdate, current: CurrentUser, db: DbDep):
    existing = await _owned_load(db, current["id"], load_id)
    data = payload.model_dump(exclude_unset=True)
    updates: dict = {}
    if "legs" in data and data["legs"] is not None:
        updates["legs"] = to_mongo(data["legs"])
    if "notes" in data:
        updates["notes"] = data["notes"]
    if "start_date" in data:
        updates["start_date"] = to_mongo(data["start_date"])
    updates["updated_at"] = _now()
    await db.loads.update_one({"id": load_id}, {"$set": updates})
    fresh = await db.loads.find_one({"id": load_id})
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(fresh, reg_map.get(existing.get("vehicle_id")))


@router.post("/{load_id}/close", response_model=LoadOut)
async def close_load(load_id: str, payload: CloseTrip, current: CurrentUser, db: DbDep):
    """Close a trip: store the accounts photo + driver balance, finalise profit, free the vehicle."""
    existing = await _owned_load(db, current["id"], load_id)
    if existing.get("status") == TripStatus.completed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip already closed")

    updates = to_mongo(
        {
            "status": TripStatus.completed.value,
            "accounts_image_url": payload.accounts_image_url,
            "driver_balance": payload.driver_balance,
            "start_km": payload.start_km,
            "end_km": payload.end_km,
            "fuel_litres": payload.fuel_litres,
            "end_date": payload.end_date or _now().date(),
            "closed_at": _now(),
            "updated_at": _now(),
        }
    )
    await db.loads.update_one({"id": load_id}, {"$set": updates})

    # Free the vehicle (only clear active_load_id if it pointed at this load).
    vehicle = await owned_vehicle_or_none(db, current["id"], existing.get("vehicle_id"))
    if vehicle is not None:
        vset = {"status": VehicleStatus.empty.value, "updated_at": _now()}
        if str(vehicle.get("active_load_id")) == load_id:
            vset["active_load_id"] = None
        await db.vehicles.update_one({"id": vehicle["id"]}, {"$set": vset})

    fresh = await db.loads.find_one({"id": load_id})
    return _out(fresh, (vehicle or {}).get("registration_number"))


@router.delete("/{load_id}", response_model=Message)
async def delete_load(load_id: str, current: CurrentUser, db: DbDep):
    existing = await _owned_load(db, current["id"], load_id)
    await db.loads.delete_one({"id": load_id})
    # If this was the vehicle's active load, mark it empty again.
    vehicle = await owned_vehicle_or_none(db, current["id"], existing.get("vehicle_id"))
    if vehicle is not None and str(vehicle.get("active_load_id")) == load_id:
        await db.vehicles.update_one(
            {"id": vehicle["id"]},
            {"$set": {"status": VehicleStatus.empty.value, "active_load_id": None, "updated_at": _now()}},
        )
    return Message(message="Load deleted.")
