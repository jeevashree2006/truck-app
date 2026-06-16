"""MySQL-backed OTP issuing and verification, keyed by login identifier.

The identifier is the normalized email or mobile number. OTP rows live in the `otps`
table; expiry is enforced in `check_otp` (and stale rows are deleted on access). We
store only the HMAC of the code.
"""

from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.security import generate_otp, hash_otp, verify_otp
from app.db.sql import Database


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


async def issue_otp(db: Database, identifier: str) -> str:
    code = generate_otp()
    expires_at = _now() + timedelta(minutes=settings.otp_expire_minutes)
    await db.otps.delete_many({"identifier": identifier})  # one active code per identifier
    await db.otps.insert_one(
        {
            "identifier": identifier,
            "code_hash": hash_otp(code),
            "attempts": 0,
            "expires_at": expires_at,
            "created_at": _now(),
        }
    )
    return code


async def check_otp(db: Database, identifier: str, code: str) -> bool:
    record = await db.otps.find_one({"identifier": identifier})
    if record is None:
        return False

    expires_at = _parse_dt(record.get("expires_at"))
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now():
            await db.otps.delete_one({"id": record["id"]})
            return False

    if record.get("attempts", 0) >= settings.otp_max_attempts:
        await db.otps.delete_one({"id": record["id"]})
        return False

    if verify_otp(code, record["code_hash"]):
        await db.otps.delete_one({"id": record["id"]})
        return True

    await db.otps.update_one({"id": record["id"]}, {"$inc": {"attempts": 1}})
    return False
