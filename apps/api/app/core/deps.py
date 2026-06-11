from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_token
from app.db.mongo import get_db
from app.models.common import oid, serialize_doc

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_database() -> AsyncIOMotorDatabase:
    return get_db()


DbDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


async def get_current_user(
    db: DbDep,
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Resolve the bearer access token to the owning user document."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _UNAUTHORIZED
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise _UNAUTHORIZED
        user_id = payload["sub"]
    except (jwt.PyJWTError, KeyError):
        raise _UNAUTHORIZED

    try:
        user = await db.users.find_one({"_id": oid(user_id)})
    except ValueError:
        raise _UNAUTHORIZED
    if user is None:
        raise _UNAUTHORIZED
    return serialize_doc(user)


CurrentUser = Annotated[dict, Depends(get_current_user)]
