"""Mongo-backed OTP issuing and verification, keyed by login identifier.

The identifier is the normalized email or mobile number. OTP documents live in the
`otps` collection and auto-expire via a TTL index on `expires_at`. We store only the
HMAC of the code.
"""

from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.security import generate_otp, hash_otp, verify_otp


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def issue_otp(db: AsyncIOMotorDatabase, identifier: str) -> str:
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


async def check_otp(db: AsyncIOMotorDatabase, identifier: str, code: str) -> bool:
    record = await db.otps.find_one({"identifier": identifier})
    if record is None:
        return False

    expires_at = record.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now():
            await db.otps.delete_one({"_id": record["_id"]})
            return False

    if record.get("attempts", 0) >= settings.otp_max_attempts:
        await db.otps.delete_one({"_id": record["_id"]})
        return False

    if verify_otp(code, record["code_hash"]):
        await db.otps.delete_one({"_id": record["_id"]})
        return True

    await db.otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
    return False
