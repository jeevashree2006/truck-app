from datetime import date, datetime
from typing import Any


def to_mongo(data: Any) -> Any:
    """Recursively convert date/datetime values to ISO strings.

    Used for the JSON-stored nested structures (legs, documents) so they round-trip
    cleanly through MySQL JSON and Pydantic. (Name kept for historical continuity.)
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
    """Normalize a row dict for the API. Rows already use a string `id`, so this is a
    light passthrough (kept so callers don't need to change)."""
    if doc is None:
        return None
    out = dict(doc)
    _id = out.pop("_id", None)  # legacy safety
    if _id is not None:
        out["id"] = str(_id)
    return out
