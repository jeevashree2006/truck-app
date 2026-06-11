from datetime import date

from fastapi import APIRouter, Query, Response

from app.core.deps import CurrentUser, DbDep
from app.services.analytics import build_dashboard, vehicle_profit_list
from app.services.loads import serialize_load
from app.services.lookup import vehicle_registration_map
from app.services.reports import fleet_report_pdf, loads_csv, vehicle_profit_csv

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/profit.csv")
async def export_profit_csv(current: CurrentUser, db: DbDep):
    rows = await vehicle_profit_list(db, current["id"])
    return Response(
        content=vehicle_profit_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vehicle-profit.csv"},
    )


@router.get("/loads.csv")
async def export_loads_csv(current: CurrentUser, db: DbDep, vehicle_id: str | None = Query(default=None)):
    query: dict = {"owner_id": current["id"]}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    docs = await db.loads.find(query).sort("created_at", -1).to_list(length=10000)
    reg_map = await vehicle_registration_map(db, current["id"])
    rows = []
    for d in docs:
        load = serialize_load(d)
        load["vehicle_registration"] = reg_map.get(load.get("vehicle_id"))
        rows.append(load)
    return Response(
        content=loads_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=loads.csv"},
    )


@router.get("/fleet.pdf")
async def export_fleet_pdf(current: CurrentUser, db: DbDep, months: int = Query(default=6, ge=3, le=24)):
    dash = await build_dashboard(db, current["id"], date.today(), months=months)
    rows = await vehicle_profit_list(db, current["id"])
    pdf_bytes = fleet_report_pdf(current, dash["kpis"], rows)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=fleet-profit-report.pdf"},
    )
