from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbDep
from app.models.common import to_mongo
from app.schemas.common import Message
from app.schemas.driver import AssignVehicle, DriverCreate, DriverOut, DriverUpdate, SetAdvance
from app.services.lookup import owned_vehicle_or_none, vehicle_registration_map

router = APIRouter(prefix="/drivers", tags=["drivers"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _primary_mobile(mobiles: list[dict] | None) -> str | None:
    mobiles = mobiles or []
    for m in mobiles:
        if m.get("primary"):
            return m.get("number")
    return mobiles[0].get("number") if mobiles else None


def _out(doc: dict, reg_map: dict[str, str]) -> DriverOut:
    d = dict(doc)
    d["primary_mobile"] = _primary_mobile(d.get("mobiles"))
    vid = d.get("assigned_vehicle_id")
    d["assigned_vehicle_registration"] = reg_map.get(vid) if vid else None
    return DriverOut(**d)


async def _owned_driver(db: DbDep, owner_id: str, driver_id: str) -> dict:
    doc = await db.drivers.find_one({"id": driver_id, "owner_id": owner_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    return doc


@router.get("", response_model=list[DriverOut])
async def list_drivers(current: CurrentUser, db: DbDep):
    docs = await db.drivers.find({"owner_id": current["id"]}).sort("created_at", -1).to_list(length=5000)
    reg_map = await vehicle_registration_map(db, current["id"])
    return [_out(d, reg_map) for d in docs]


@router.post("", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
async def create_driver(payload: DriverCreate, current: CurrentUser, db: DbDep):
    doc = to_mongo(payload.model_dump())
    doc["owner_id"] = current["id"]
    doc["status"] = "inactive"
    doc["assigned_vehicle_id"] = None
    doc["advance_amount"] = 0.0
    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    res = await db.drivers.insert_one(doc)
    created = await db.drivers.find_one({"id": res.inserted_id})
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(created, reg_map)


@router.patch("/{driver_id}", response_model=DriverOut)
async def update_driver(driver_id: str, payload: DriverUpdate, current: CurrentUser, db: DbDep):
    await _owned_driver(db, current["id"], driver_id)
    updates = to_mongo({k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None})
    updates["updated_at"] = _now()
    await db.drivers.update_one({"id": driver_id}, {"$set": updates})
    fresh = await db.drivers.find_one({"id": driver_id})
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(fresh, reg_map)


@router.patch("/{driver_id}/assign", response_model=DriverOut)
async def assign_vehicle(driver_id: str, payload: AssignVehicle, current: CurrentUser, db: DbDep):
    """Assign the driver to a vehicle (→ active / 'on trip') or leave it (→ inactive)."""
    await _owned_driver(db, current["id"], driver_id)
    if payload.vehicle_id:
        if await owned_vehicle_or_none(db, current["id"], payload.vehicle_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
        # Allow up to TWO live drivers per vehicle (e.g. a long-haul relay pair).
        others = [
            o
            for o in await db.drivers.find(
                {"owner_id": current["id"], "assigned_vehicle_id": payload.vehicle_id}
            ).to_list(length=2000)
            if o["id"] != driver_id
        ]
        if len(others) >= 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This vehicle already has 2 drivers assigned. Free one before adding another.",
            )
        await db.drivers.update_one(
            {"id": driver_id},
            {"$set": {"assigned_vehicle_id": payload.vehicle_id, "status": "active", "updated_at": _now()}},
        )
    else:
        await db.drivers.update_one(
            {"id": driver_id},
            {"$set": {"assigned_vehicle_id": None, "status": "inactive", "updated_at": _now()}},
        )
    fresh = await db.drivers.find_one({"id": driver_id})
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(fresh, reg_map)


@router.patch("/{driver_id}/advance", response_model=DriverOut)
async def set_advance(driver_id: str, payload: SetAdvance, current: CurrentUser, db: DbDep):
    """Set/adjust the driver's outstanding advance (reduce as it's repaid)."""
    await _owned_driver(db, current["id"], driver_id)
    await db.drivers.update_one(
        {"id": driver_id}, {"$set": {"advance_amount": payload.advance_amount, "updated_at": _now()}}
    )
    fresh = await db.drivers.find_one({"id": driver_id})
    reg_map = await vehicle_registration_map(db, current["id"])
    return _out(fresh, reg_map)


@router.delete("/{driver_id}", response_model=Message)
async def delete_driver(driver_id: str, current: CurrentUser, db: DbDep):
    await _owned_driver(db, current["id"], driver_id)
    await db.drivers.delete_one({"id": driver_id})
    return Message(message="Driver deleted.")
