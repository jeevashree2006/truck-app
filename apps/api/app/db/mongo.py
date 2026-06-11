from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class _MongoState:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


state = _MongoState()


async def connect_to_mongo() -> None:
    state.client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000)
    state.db = state.client[settings.mongodb_db]
    await _ensure_indexes(state.db)


async def close_mongo_connection() -> None:
    if state.client is not None:
        state.client.close()
        state.client = None
        state.db = None


def get_db() -> AsyncIOMotorDatabase:
    if state.db is None:
        raise RuntimeError("MongoDB is not initialised. Did the lifespan run?")
    return state.db


async def _ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create the indexes the app relies on (idempotent)."""
    # Users can sign in by email OR mobile; uniqueness is enforced only over real
    # string values (partial index), so many mobile-only users (no email) don't
    # collide on a null/absent email — and vice-versa.
    await db.users.create_index(
        "email", unique=True, partialFilterExpression={"email": {"$type": "string"}}
    )
    await db.users.create_index(
        "mobile", unique=True, partialFilterExpression={"mobile": {"$type": "string"}}
    )
    # OTP identifier is the channel target (email address or mobile number).
    await db.otps.create_index("identifier")
    # TTL index: OTP documents auto-expire at `expires_at`.
    await db.otps.create_index("expires_at", expireAfterSeconds=0)
    await db.vehicles.create_index([("owner_id", 1), ("registration_number", 1)])
    await db.vehicles.create_index([("owner_id", 1), ("status", 1)])
    await db.loads.create_index([("owner_id", 1), ("vehicle_id", 1), ("created_at", -1)])
    await db.loads.create_index([("owner_id", 1), ("status", 1)])
    await db.repairs.create_index([("owner_id", 1), ("vehicle_id", 1), ("date", -1)])
    await db.notifications.create_index([("owner_id", 1), ("created_at", -1)])
