from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbDep
from app.models.common import serialize_doc, to_mongo
from app.schemas.common import Message
from app.schemas.repair import RepairCreate, RepairOut, RepairUpdate
from app.services.lookup import owned_vehicle_or_none, vehicle_registration_map

router = APIRouter(prefix="/repairs", tags=["repairs"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=list[RepairOut])
async def list_repairs(current: CurrentUser, db: DbDep, vehicle_id: str | None = Query(default=None)):
    query: dict = {"owner_id": current["id"]}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    docs = await db.repairs.find(query).sort("date", -1).to_list(length=5000)
    reg_map = await vehicle_registration_map(db, current["id"])
    out = []
    for d in docs:
        r = serialize_doc(d)
        r["vehicle_registration"] = reg_map.get(r.get("vehicle_id"))
        out.append(RepairOut(**r))
    return out


@router.post("", response_model=RepairOut, status_code=status.HTTP_201_CREATED)
async def create_repair(payload: RepairCreate, current: CurrentUser, db: DbDep):
    vehicle = await owned_vehicle_or_none(db, current["id"], payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    doc = to_mongo(payload.model_dump())
    doc["owner_id"] = current["id"]
    doc["created_at"] = _now()
    result = await db.repairs.insert_one(doc)
    created = serialize_doc(await db.repairs.find_one({"id": result.inserted_id}))
    created["vehicle_registration"] = vehicle.get("registration_number")
    return RepairOut(**created)


@router.patch("/{repair_id}", response_model=RepairOut)
async def update_repair(repair_id: str, payload: RepairUpdate, current: CurrentUser, db: DbDep):
    existing = await _owned_repair(db, current["id"], repair_id)
    updates = to_mongo({k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None})
    await db.repairs.update_one({"id": repair_id}, {"$set": updates})
    fresh = serialize_doc(await db.repairs.find_one({"id": repair_id}))
    reg_map = await vehicle_registration_map(db, current["id"])
    fresh["vehicle_registration"] = reg_map.get(existing.get("vehicle_id"))
    return RepairOut(**fresh)


@router.delete("/{repair_id}", response_model=Message)
async def delete_repair(repair_id: str, current: CurrentUser, db: DbDep):
    await _owned_repair(db, current["id"], repair_id)
    await db.repairs.delete_one({"id": repair_id})
    return Message(message="Repair deleted.")


async def _owned_repair(db: DbDep, owner_id: str, repair_id: str) -> dict:
    doc = await db.repairs.find_one({"id": repair_id, "owner_id": owner_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair not found")
    return doc
