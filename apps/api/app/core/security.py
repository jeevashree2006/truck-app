import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(subject: str, token_type: TokenType, extra: dict[str, Any] | None = None) -> str:
    """Create a signed JWT for the given subject (user id)."""
    if token_type == "access":
        expires = _now() + timedelta(minutes=settings.access_token_expire_minutes)
    else:
        expires = _now() + timedelta(days=settings.refresh_token_expire_days)

    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(_now().timestamp()),
        "exp": int(expires.timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def generate_otp(length: int | None = None) -> str:
    """Generate a numeric OTP code."""
    n = length or settings.otp_length
    return "".join(secrets.choice("0123456789") for _ in range(n))


def hash_otp(code: str) -> str:
    """Deterministically hash an OTP with the app secret (HMAC-SHA256).

    OTPs are short-lived and single-use, so an HMAC keyed by the server secret is
    sufficient and avoids a native bcrypt build on free-tier hosts.
    """
    return hmac.new(settings.jwt_secret.encode(), code.encode(), hashlib.sha256).hexdigest()


def verify_otp(code: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_otp(code), hashed)
