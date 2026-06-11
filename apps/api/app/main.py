import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import close_mongo_connection, connect_to_mongo, state
from app.routers import (
    analytics,
    auth,
    loads,
    notifications,
    repairs,
    reports,
    users,
    vehicles,
)
from app.schemas.common import HealthResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("fleet")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect_to_mongo()
        logger.info("Connected to MongoDB (%s)", settings.mongodb_db)
    except Exception:  # noqa: BLE001 - allow the app to boot so /health reports the issue
        logger.exception("MongoDB connection failed at startup")
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="Fleet / Lorry / Container Owner management API — vehicles, documents, "
    "multi-leg loads (trips), driver settlement, profit analytics and reports.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, users, vehicles, loads, repairs, analytics, notifications, reports):
    app.include_router(r.router, prefix="/api/v1")


@app.get("/", tags=["meta"])
async def root():
    return {"app": settings.app_name, "docs": "/docs", "health": "/health"}


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health():
    db_status = "down"
    try:
        if state.client is not None:
            await state.client.admin.command("ping")
            db_status = "up"
    except Exception:  # noqa: BLE001
        db_status = "down"
    return HealthResponse(status="ok", app=settings.app_name, env=settings.env, db=db_status)


@app.get("/api/v1/reference", tags=["meta"])
async def reference_data():
    """Enum values, so clients stay in sync with the API."""
    from app.models.enums import (
        COMMON_LENGTHS_FEET,
        AxleType,
        BodyType,
        DocumentType,
        TripStatus,
        VehicleStatus,
    )

    return {
        "axle_types": [e.value for e in AxleType],
        "body_types": [e.value for e in BodyType],
        "vehicle_statuses": [e.value for e in VehicleStatus],
        "document_types": [e.value for e in DocumentType],
        "trip_statuses": [e.value for e in TripStatus],
        "common_lengths_feet": COMMON_LENGTHS_FEET,
        "doc_expiring_soon_days": settings.doc_expiring_soon_days,
        "languages": ["en", "ta", "hi"],
    }
