from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbDep
from app.models.common import to_mongo
from app.models.enums import VehicleStatus
from app.schemas.common import Message
from app.schemas.vehicle import StatusUpdate, VehicleCreate, VehicleOut, VehicleUpdate
from app.services.lookup import enrich_vehicle, owned_vehicle_or_none
from app.services.loads import compute_totals

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _with_profit(db: DbDep, owner_id: str, vehicle_doc: dict) -> dict:
    """Enrich a vehicle with document statuses + lifetime trip count & profit."""
    v = enrich_vehicle(vehicle_doc)
    loads = await db.loads.find(
        {"owner_id": owner_id, "vehicle_id": v["id"], "status": "completed"}
    ).to_list(length=5000)
    v["trips_count"] = len(loads)
    v["total_profit"] = round(sum(compute_totals(l.get("legs") or [])["profit"] for l in loads), 2)
    return v


@router.get("", response_model=list[VehicleOut])
async def list_vehicles(current: CurrentUser, db: DbDep):
    docs = await db.vehicles.find({"owner_id": current["id"]}).sort("created_at", -1).to_list(length=2000)
    return [VehicleOut(**await _with_profit(db, current["id"], d)) for d in docs]


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(payload: VehicleCreate, current: CurrentUser, db: DbDep):
    reg = payload.registration_number.upper()
    if await db.vehicles.find_one({"owner_id": current["id"], "registration_number": reg}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vehicle already exists")

    doc = to_mongo(payload.model_dump())
    doc["registration_number"] = reg
    doc["owner_id"] = current["id"]
    doc["status"] = VehicleStatus.empty.value
    doc["active_load_id"] = None
    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    result = await db.vehicles.insert_one(doc)
    created = await db.vehicles.find_one({"id": result.inserted_id})
    return VehicleOut(**await _with_profit(db, current["id"], created))


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(vehicle_id: str, current: CurrentUser, db: DbDep):
    doc = await owned_vehicle_or_none(db, current["id"], vehicle_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return VehicleOut(**await _with_profit(db, current["id"], doc))


@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(vehicle_id: str, payload: VehicleUpdate, current: CurrentUser, db: DbDep):
    doc = await owned_vehicle_or_none(db, current["id"], vehicle_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    updates = to_mongo({k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None})
    if "registration_number" in updates:
        updates["registration_number"] = updates["registration_number"].upper()
    updates["updated_at"] = _now()
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": updates})
    fresh = await db.vehicles.find_one({"id": vehicle_id})
    return VehicleOut(**await _with_profit(db, current["id"], fresh))


@router.patch("/{vehicle_id}/status", response_model=VehicleOut)
async def update_status(vehicle_id: str, payload: StatusUpdate, current: CurrentUser, db: DbDep):
    """Manually set the operational status (empty / on the way / waiting to unload)."""
    doc = await owned_vehicle_or_none(db, current["id"], vehicle_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await db.vehicles.update_one(
        {"id": vehicle_id}, {"$set": {"status": payload.status.value, "updated_at": _now()}}
    )
    fresh = await db.vehicles.find_one({"id": vehicle_id})
    return VehicleOut(**await _with_profit(db, current["id"], fresh))


@router.delete("/{vehicle_id}", response_model=Message)
async def delete_vehicle(vehicle_id: str, current: CurrentUser, db: DbDep):
    doc = await owned_vehicle_or_none(db, current["id"], vehicle_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await db.vehicles.delete_one({"id": vehicle_id})
    await db.loads.delete_many({"vehicle_id": vehicle_id})
    await db.repairs.delete_many({"vehicle_id": vehicle_id})
    return Message(message="Vehicle and related loads/repairs deleted.")
