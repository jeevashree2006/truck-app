from datetime import date, datetime
from typing import Any

from bson import ObjectId


def to_mongo(data: Any) -> Any:
    """Recursively convert Python date/datetime values to ISO strings for BSON storage.

    We store dates as ISO strings (date -> 'YYYY-MM-DD', datetime -> RFC3339) so the
    documents stay human-readable in Atlas and round-trip cleanly through Pydantic.
    """
    if isinstance(data, dict):
        return {k: to_mongo(v) for k, v in data.items()}
    if isinstance(data, list):
        return [to_mongo(v) for v in data]
    if isinstance(data, datetime):
        return data.isoformat()
    if isinstance(data, date):
        return data.isoformat()
    return data


def serialize_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert a raw Mongo document into an API-friendly dict (`_id` -> `id`)."""
    if doc is None:
        return None
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    return out


def oid(value: str) -> ObjectId:
    """Parse a string into an ObjectId, raising ValueError on bad input."""
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id")
    return ObjectId(value)
