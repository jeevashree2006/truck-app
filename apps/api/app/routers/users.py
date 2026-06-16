from fastapi import APIRouter

from app.core.deps import CurrentUser, DbDep
from app.routers.auth import _user_public
from app.schemas.common import Message
from app.schemas.user import PushTokenIn, UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserPublic)
async def update_me(payload: UserUpdate, current: CurrentUser, db: DbDep):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.users.update_one({"id": current["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": current["id"]})
    return UserPublic(**_user_public(fresh))


@router.post("/me/push-token", response_model=Message)
async def register_push_token(payload: PushTokenIn, current: CurrentUser, db: DbDep):
    """Register an Expo/Firebase push token for this device (deduped)."""
    await db.users.update_one(
        {"id": current["id"]},
        {"$addToSet": {"push_tokens": payload.token}},
    )
    return Message(message="Push token registered.")


@router.delete("/me/push-token", response_model=Message)
async def remove_push_token(payload: PushTokenIn, current: CurrentUser, db: DbDep):
    await db.users.update_one(
        {"id": current["id"]},
        {"$pull": {"push_tokens": payload.token}},
    )
    return Message(message="Push token removed.")
