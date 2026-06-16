"""Small shared helpers for enriching documents with cross-collection data."""

from app.db.sql import Database
from app.models.common import serialize_doc
from app.services.status import build_document_statuses


async def vehicle_registration_map(db: Database, owner_id: str) -> dict[str, str]:
    """Map vehicle id -> registration number for the owner's fleet (for labels)."""
    vehicles = await db.vehicles.find({"owner_id": owner_id}).to_list(length=5000)
    return {v["id"]: v.get("registration_number", "") for v in vehicles}


def enrich_vehicle(doc: dict) -> dict:
    """Add computed document_statuses + overall_doc_status to a serialized vehicle."""
    v = serialize_doc(doc)
    rows, overall = build_document_statuses(v.get("documents"))
    v["document_statuses"] = rows
    v["overall_doc_status"] = overall
    return v


async def owned_vehicle_or_none(db: Database, owner_id: str, vehicle_id: str) -> dict | None:
    return await db.vehicles.find_one({"id": vehicle_id, "owner_id": owner_id})
