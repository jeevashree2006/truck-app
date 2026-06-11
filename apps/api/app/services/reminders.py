"""Build live document-expiry reminder cards for an owner.

These power the notifications screen, the daily summary email/SMS and push alerts.
Computed on demand from the owner's current vehicles so they always reflect the
latest document dates.
"""

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.common import serialize_doc
from app.models.enums import DocStatus, NotificationType
from app.services.status import build_document_statuses

_DOC_LABELS = {
    "ddc": "DDC Form",
    "rc": "RC",
    "insurance": "Insurance",
    "fitness": "Fitness Certificate",
    "permit": "Permit",
    "road_tax": "Road Tax",
    "puc": "PUC",
    "national_permit": "National Permit",
}


async def build_reminders(db: AsyncIOMotorDatabase, owner_id: str) -> list[dict]:
    vehicles = await db.vehicles.find({"owner_id": owner_id}).to_list(length=2000)
    reminders: list[dict] = []
    for v in vehicles:
        v = serialize_doc(v)
        reg = v.get("registration_number", "Vehicle")
        rows, _ = build_document_statuses(v.get("documents"))
        for row in rows:
            if row["status"] in (DocStatus.expired, DocStatus.expiring):
                days = row["days_to_expiry"]
                label = _DOC_LABELS.get(row["type"], row["type"].upper())
                if row["status"] == DocStatus.expired:
                    title = f"{label} expired — {reg}"
                    body = f"The {label} for {reg} expired {abs(days)} day(s) ago. Renew immediately."
                    severity = "high"
                else:
                    title = f"{label} expiring soon — {reg}"
                    body = f"The {label} for {reg} expires in {days} day(s)."
                    severity = "medium"
                reminders.append(
                    {
                        "type": NotificationType.document_expiry.value,
                        "title": title,
                        "body": body,
                        "vehicle_id": v["id"],
                        "severity": severity,
                        "days": days,
                    }
                )

    sev_rank = {"high": 0, "medium": 1, "low": 2}
    reminders.sort(key=lambda r: (sev_rank.get(r["severity"], 3), r.get("days") if r.get("days") is not None else 9999))
    return reminders


async def daily_summary(db: AsyncIOMotorDatabase, owner_id: str) -> dict:
    reminders = await build_reminders(db, owner_id)
    title = "Fleet daily summary"
    body = "All documents valid. You're all set." if not reminders else f"{len(reminders)} document alert(s). Tap to review."
    return {
        "type": NotificationType.daily_summary.value,
        "title": title,
        "body": body,
        "count": len(reminders),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": reminders[:20],
    }
