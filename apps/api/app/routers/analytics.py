from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbDep
from app.schemas.analytics import DashboardResponse, TripProfitRow, VehicleProfit
from app.services.analytics import build_dashboard, trips_for_vehicle, vehicle_profit_list
from app.services.lookup import owned_vehicle_or_none

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(current: CurrentUser, db: DbDep, months: int = Query(default=6, ge=3, le=24)):
    data = await build_dashboard(db, current["id"], date.today(), months=months)
    return DashboardResponse(**data)


@router.get("/profit", response_model=list[VehicleProfit])
async def profit_by_vehicle(current: CurrentUser, db: DbDep):
    """Per-vehicle profit summary — the Profit page list."""
    return [VehicleProfit(**v) for v in await vehicle_profit_list(db, current["id"])]


@router.get("/profit/{vehicle_id}", response_model=list[TripProfitRow])
async def vehicle_trips_profit(vehicle_id: str, current: CurrentUser, db: DbDep):
    """All trips for a vehicle with per-trip profit."""
    if await owned_vehicle_or_none(db, current["id"], vehicle_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return [TripProfitRow(**r) for r in await trips_for_vehicle(db, current["id"], vehicle_id)]
