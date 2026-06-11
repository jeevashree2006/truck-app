"""Pure domain logic: colour-coded document status.

Kept free of database/IO concerns so it is trivially unit-testable and reused by
both the API responses and the notification/reminder jobs.
"""

from datetime import date

from app.core.config import settings
from app.models.enums import DocStatus, DocumentType


def _today() -> date:
    return date.today()


def compute_doc_status(
    expiry: date | None,
    issue: date | None = None,
    *,
    expiring_soon_days: int | None = None,
) -> tuple[DocStatus, int | None, float | None]:
    """Return (status, days_to_expiry, progress) for a document.

    - status: green/valid, yellow/expiring, red/expired, or unknown
    - days_to_expiry: signed days until expiry (negative if already expired)
    - progress: 0..1 fraction of the validity window elapsed (for the timeline bar)
    """
    threshold = expiring_soon_days if expiring_soon_days is not None else settings.doc_expiring_soon_days
    if expiry is None:
        return DocStatus.unknown, None, None

    today = _today()
    days_to_expiry = (expiry - today).days

    if days_to_expiry < 0:
        status = DocStatus.expired
    elif days_to_expiry <= threshold:
        status = DocStatus.expiring
    else:
        status = DocStatus.valid

    progress: float | None
    if issue is not None and expiry > issue:
        span = (expiry - issue).days
        elapsed = (today - issue).days
        progress = max(0.0, min(1.0, elapsed / span)) if span > 0 else 1.0
    else:
        if days_to_expiry >= threshold:
            progress = 0.0
        elif days_to_expiry < 0:
            progress = 1.0
        else:
            progress = 1.0 - (days_to_expiry / threshold)

    return status, days_to_expiry, round(progress, 3) if progress is not None else None


def build_document_statuses(documents: dict | None) -> tuple[list[dict], DocStatus]:
    """Expand a vehicle's `documents` map into enriched status rows + an overall status."""
    documents = documents or {}
    rows: list[dict] = []
    rank = {DocStatus.expired: 3, DocStatus.expiring: 2, DocStatus.valid: 1, DocStatus.unknown: 0}
    overall = DocStatus.unknown

    for doc_type in DocumentType:
        info = documents.get(doc_type.value) or {}
        expiry = _parse_date(info.get("expiry_date"))
        issue = _parse_date(info.get("issue_date"))
        status, days, progress = compute_doc_status(expiry, issue)
        doc_urls = info.get("doc_urls") or ([info["doc_url"]] if info.get("doc_url") else [])
        rows.append(
            {
                "type": doc_type.value,
                "number": info.get("number"),
                "issue_date": issue,
                "expiry_date": expiry,
                "doc_url": info.get("doc_url"),
                "doc_urls": doc_urls,
                "status": status,
                "days_to_expiry": days,
                "progress": progress,
            }
        )
        if expiry is not None and rank[status] > rank[overall]:
            overall = status

    return rows, overall


def _parse_date(value) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None
