from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbDep
from app.services.email import send_email
from app.services.reminders import build_reminders, daily_summary

router = APIRouter(prefix="/notifications", tags=["notifications"])


class ReminderCard(BaseModel):
    type: str
    title: str
    body: str
    vehicle_id: str | None = None
    severity: str = "medium"
    days: int | None = None


class DailySummary(BaseModel):
    type: str
    title: str
    body: str
    count: int
    generated_at: str
    items: list[ReminderCard]


@router.get("", response_model=list[ReminderCard])
async def list_reminders(current: CurrentUser, db: DbDep):
    """Live, colour-coded reminder cards (document expiry + service due)."""
    return [ReminderCard(**r) for r in await build_reminders(db, current["id"])]


@router.get("/daily-summary", response_model=DailySummary)
async def get_daily_summary(current: CurrentUser, db: DbDep):
    return DailySummary(**await daily_summary(db, current["id"]))


@router.post("/daily-summary/send", response_model=DailySummary)
async def send_daily_summary(current: CurrentUser, db: DbDep):
    """Email the owner their daily fleet summary (used by the scheduled job too)."""
    summary = await daily_summary(db, current["id"])
    items_html = "".join(
        f"<li style='margin:6px 0'><b>{i['title']}</b><br/>"
        f"<span style='color:#64748b'>{i['body']}</span></li>"
        for i in summary["items"]
    )
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#1d4ed8">{summary['title']}</h2>
      <p style="color:#475569">{summary['body']}</p>
      <ul style="list-style:none;padding:0">{items_html or '<li>No alerts 🎉</li>'}</ul>
    </div>"""
    await send_email(current["email"], summary["title"], html, summary["body"])

    # Persist a record so the in-app feed has history.
    await db.notifications.insert_one(
        {
            "owner_id": current["id"],
            "type": summary["type"],
            "title": summary["title"],
            "body": summary["body"],
            "vehicle_id": None,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return DailySummary(**summary)
