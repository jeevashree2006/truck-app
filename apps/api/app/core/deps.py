from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.core.security import decode_token
from app.db.sql import Database, get_db
from app.models.common import serialize_doc

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


DbDep = Annotated[Database, Depends(get_db)]


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

    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise _UNAUTHORIZED
    return serialize_doc(user)


CurrentUser = Annotated[dict, Depends(get_current_user)]
