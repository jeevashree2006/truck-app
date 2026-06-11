"""Helpers for the dual email / mobile login identifier."""

import re

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MOBILE_RE = re.compile(r"^\+?\d{7,15}$")


def normalize_mobile(raw: str) -> str:
    """Strip spaces/dashes from a mobile number, keeping a leading +."""
    cleaned = re.sub(r"[\s\-()]", "", raw.strip())
    return cleaned


def detect_channel(identifier: str) -> str:
    """Return 'email' or 'sms' for a login identifier. Raises ValueError if neither."""
    value = identifier.strip()
    if _EMAIL_RE.match(value):
        return "email"
    if _MOBILE_RE.match(normalize_mobile(value)):
        return "sms"
    raise ValueError("Identifier must be a valid email address or mobile number")


def normalize_identifier(identifier: str) -> tuple[str, str]:
    """Return (channel, normalized_identifier)."""
    channel = detect_channel(identifier)
    if channel == "email":
        return channel, identifier.strip().lower()
    return channel, normalize_mobile(identifier)
