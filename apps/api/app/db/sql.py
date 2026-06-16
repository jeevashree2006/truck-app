"""MySQL data layer (SQLAlchemy 2.0 async) with a tiny Mongo-style facade.

The document model maps to one table per collection. Scalar fields are real columns;
the genuinely nested parts (`legs`, `documents`, `push_tokens`) are stored as MySQL
JSON. A small `Collection` facade exposes the subset of Motor operations the app uses
(`find_one`, `find().sort().to_list()`, `insert_one`, `update_one` with
`$set`/`$inc`/`$addToSet`/`$pull`, `delete_one`, `delete_many`) so routers/services
read almost the same as before — documents are plain dicts keyed by `id`.
"""

from __future__ import annotations

import secrets
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    delete as sa_delete,
    select,
    text,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


def new_id() -> str:
    """24-char hex id — ObjectId-shaped, so the API's string-id contract is unchanged."""
    return secrets.token_hex(12)


def _prep(value: Any) -> Any:
    """Coerce date/datetime scalars to ISO strings (temporal columns are stored as text)."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


class Base(DeclarativeBase):
    def to_doc(self) -> dict:
        """Return the row as a plain document dict (id is a string, like the old API)."""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    mobile: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    theme: Mapped[str] = mapped_column(String(16), default="system")
    push_tokens: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Otp(Base):
    __tablename__ = "otps"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    identifier: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (UniqueConstraint("owner_id", "registration_number", name="uq_owner_reg"),)
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(24), index=True)
    registration_number: Mapped[str] = mapped_column(String(20))
    axle_type: Mapped[str] = mapped_column(String(16), default="multi")
    length_feet: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body_type: Mapped[str] = mapped_column(String(16), default="container")
    manufacture_month: Mapped[str | None] = mapped_column(String(7), nullable=True)
    age_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chassis_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    make: Mapped[str | None] = mapped_column(String(80), nullable=True)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)
    documents: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="empty")
    active_load_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Load(Base):
    __tablename__ = "loads"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(24), index=True)
    vehicle_id: Mapped[str] = mapped_column(String(24), index=True)
    status: Mapped[str] = mapped_column(String(16), default="ongoing")
    start_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    legs: Mapped[list] = mapped_column(JSON, default=list)
    accounts_image_url: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)
    driver_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    end_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_litres: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    closed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Repair(Base):
    __tablename__ = "repairs"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(24), index=True)
    vehicle_id: Mapped[str] = mapped_column(String(24), index=True)
    date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    description: Mapped[str] = mapped_column(String(200))
    amount: Mapped[float] = mapped_column(Float, default=0)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    odometer_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(24), index=True)
    type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    vehicle_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Driver(Base):
    __tablename__ = "drivers"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(24), index=True)
    name: Mapped[str] = mapped_column(String(120))
    mobiles: Mapped[list] = mapped_column(JSON, default=list)  # [{number, primary}]
    licence_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    licence_image_url: Mapped[str | None] = mapped_column(LONGTEXT, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="inactive")  # active | inactive
    assigned_vehicle_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    advance_amount: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


# ---------------------------------------------------------------------------
# Mongo-style facade
# ---------------------------------------------------------------------------
class _InsertResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class Cursor:
    """Lazy result of `find()` supporting `.sort(field, dir).to_list(length)`."""

    def __init__(self, session: AsyncSession, model: type[Base], conds: list):
        self._s = session
        self._m = model
        self._conds = conds
        self._sort: tuple[str, int] | None = None

    def sort(self, field: str, direction: int = 1) -> "Cursor":
        self._sort = (field, direction)
        return self

    async def to_list(self, length: int | None = None) -> list[dict]:
        stmt = select(self._m).where(*self._conds)
        if self._sort:
            col = getattr(self._m, self._sort[0])
            stmt = stmt.order_by(col.desc() if self._sort[1] < 0 else col.asc())
        if length:
            stmt = stmt.limit(length)
        rows = (await self._s.execute(stmt)).scalars().all()
        return [r.to_doc() for r in rows]


class Collection:
    def __init__(self, session: AsyncSession, model: type[Base]):
        self._s = session
        self._m = model
        self._cols = {c.name for c in model.__table__.columns}

    def _where(self, flt: dict) -> list:
        return [getattr(self._m, k) == v for k, v in (flt or {}).items()]

    async def _one(self, flt: dict):
        stmt = select(self._m).where(*self._where(flt)).limit(1)
        return (await self._s.execute(stmt)).scalars().first()

    async def find_one(self, flt: dict, projection: dict | None = None) -> dict | None:
        row = await self._one(flt)
        return row.to_doc() if row is not None else None

    def find(self, flt: dict | None = None, projection: dict | None = None) -> Cursor:
        return Cursor(self._s, self._m, self._where(flt or {}))

    async def insert_one(self, doc: dict) -> _InsertResult:
        data = {k: _prep(v) for k, v in doc.items() if k in self._cols}
        data.setdefault("id", new_id())
        obj = self._m(**data)
        self._s.add(obj)
        await self._s.flush()
        return _InsertResult(obj.id)

    async def update_one(self, flt: dict, update: dict) -> None:
        row = await self._one(flt)
        if row is None:
            return
        for k, v in update.get("$set", {}).items():
            if k in self._cols:
                setattr(row, k, _prep(v))
        for k, v in update.get("$inc", {}).items():
            if k in self._cols:
                setattr(row, k, (getattr(row, k) or 0) + v)
        for k, v in update.get("$addToSet", {}).items():
            lst = list(getattr(row, k) or [])
            if v not in lst:
                lst.append(v)
            setattr(row, k, lst)
        for k, v in update.get("$pull", {}).items():
            setattr(row, k, [x for x in (getattr(row, k) or []) if x != v])
        await self._s.flush()

    async def delete_one(self, flt: dict) -> None:
        row = await self._one(flt)
        if row is not None:
            await self._s.delete(row)
            await self._s.flush()

    async def delete_many(self, flt: dict) -> None:
        await self._s.execute(sa_delete(self._m).where(*self._where(flt)))
        await self._s.flush()


class Database:
    """Bundles the collections for one request's session (mirrors the old `db`)."""

    def __init__(self, session: AsyncSession):
        self.users = Collection(session, User)
        self.otps = Collection(session, Otp)
        self.vehicles = Collection(session, Vehicle)
        self.loads = Collection(session, Load)
        self.repairs = Collection(session, Repair)
        self.notifications = Collection(session, Notification)
        self.drivers = Collection(session, Driver)


# ---------------------------------------------------------------------------
# Engine / session / lifecycle
# ---------------------------------------------------------------------------
def _engine_connect_args() -> dict:
    """TLS for managed MySQL (TiDB Serverless / Aiven / PlanetScale) when DB_SSL=true."""
    if settings.db_ssl:
        import ssl as _ssl

        return {"ssl": _ssl.create_default_context()}
    return {}


engine = create_async_engine(
    settings.sqlalchemy_url, pool_pre_ping=True, pool_recycle=1800, connect_args=_engine_connect_args()
)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    """Create all tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db() -> None:
    await engine.dispose()


async def ping() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001
        return False


async def get_db():
    """FastAPI dependency: yield a request-scoped Database, commit on success."""
    async with async_session() as session:
        db = Database(session)
        try:
            yield db
            await session.commit()
        except Exception:
            await session.rollback()
            raise
