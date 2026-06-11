from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbDep
from app.core.security import create_token, decode_token
from app.models.common import oid, serialize_doc
from app.schemas.auth import (
    OTPRequested,
    RefreshRequest,
    RequestOTP,
    TokenPair,
    VerifyOTP,
)
from app.schemas.user import UserPublic
from app.services.email import send_otp
from app.services.otp_store import check_otp, issue_otp
from app.utils.contact import normalize_identifier, normalize_mobile

router = APIRouter(prefix="/auth", tags=["auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _find_user(db, channel: str, identifier: str):
    field = "email" if channel == "email" else "mobile"
    return await db.users.find_one({field: identifier})


@router.post("/request-otp", response_model=OTPRequested)
async def request_otp(payload: RequestOTP, db: DbDep):
    """Issue a one-time login code to an email OR mobile (passwordless sign-in/up)."""
    try:
        channel, identifier = normalize_identifier(payload.identifier)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    existing = await _find_user(db, channel, identifier)
    # Login requires an existing account; signup requires a new one.
    if not payload.signup and existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email. Please sign up first.",
        )
    if payload.signup and existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        )

    code = await issue_otp(db, identifier)
    await send_otp(channel, identifier, code)

    # Reveal the (real, server-generated) code only in dev AND only when the channel it
    # was sent on has no real provider configured — so it's testable without SMS/email.
    channel_has_provider = settings.has_sms_provider if channel == "sms" else settings.has_email_provider
    return OTPRequested(
        message=f"OTP sent via {channel}.",
        channel=channel,
        dev_code=code if (settings.is_dev and not channel_has_provider) else None,
    )


@router.post("/verify-otp", response_model=TokenPair)
async def verify_otp_endpoint(payload: VerifyOTP, db: DbDep):
    try:
        channel, identifier = normalize_identifier(payload.identifier)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not await check_otp(db, identifier, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    user = await _find_user(db, channel, identifier)
    if user is None:
        # First sign-up: seed the user with the login identifier + any extra profile
        # fields. Only store email/mobile when present — never a null value, so the
        # partial unique indexes don't collide across mobile-only / email-only users.
        email = payload.email.lower() if payload.email else (identifier if channel == "email" else None)
        mobile = normalize_mobile(payload.mobile) if payload.mobile else (identifier if channel == "sms" else None)
        doc = {
            "name": payload.name,
            "language": "en",
            "theme": "system",
            "push_tokens": [],
            "created_at": _now(),
        }
        if email:
            doc["email"] = email
        if mobile:
            doc["mobile"] = mobile
        result = await db.users.insert_one(doc)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])
        # Backfill any newly provided profile details.
        backfill = {}
        if payload.name and not user.get("name"):
            backfill["name"] = payload.name
        if payload.email and not user.get("email"):
            backfill["email"] = payload.email.lower()
        if payload.mobile and not user.get("mobile"):
            backfill["mobile"] = normalize_mobile(payload.mobile)
        if backfill:
            await db.users.update_one({"_id": user["_id"]}, {"$set": backfill})

    return TokenPair(
        access_token=create_token(user_id, "access"),
        refresh_token=create_token(user_id, "refresh"),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: DbDep):
    import jwt

    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise ValueError("wrong token type")
        user_id = decoded["sub"]
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await db.users.find_one({"_id": oid(user_id)})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenPair(
        access_token=create_token(user_id, "access"),
        refresh_token=create_token(user_id, "refresh"),
    )


@router.get("/me", response_model=UserPublic)
async def me(current: CurrentUser):
    return UserPublic(**_user_public(current))


def _user_public(user: dict) -> dict:
    user = serialize_doc(user) if "_id" in user else user
    return {
        "id": user["id"],
        "name": user.get("name"),
        "email": user.get("email"),
        "mobile": user.get("mobile"),
        "language": user.get("language", "en"),
        "theme": user.get("theme", "system"),
        "created_at": user.get("created_at"),
    }
