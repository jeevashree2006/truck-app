from pydantic import BaseModel


class DashboardKpis(BaseModel):
    total_vehicles: int = 0
    vehicles_on_way: int = 0
    vehicles_empty: int = 0
    vehicles_waiting: int = 0
    active_loads: int = 0
    trips_this_month: int = 0
    rent_this_month: float = 0.0
    spend_this_month: float = 0.0
    profit_this_month: float = 0.0
    profit_all_time: float = 0.0
    documents_expiring: int = 0


class MonthlyProfitPoint(BaseModel):
    month: str   # 'YYYY-MM'
    label: str   # 'Jun'
    rent: float = 0.0
    spend: float = 0.0
    profit: float = 0.0
    trips: int = 0


class SpendSlice(BaseModel):
    category: str   # diesel | commission | salary | fastag
    label: str
    amount: float
    percentage: float


class StatusSlice(BaseModel):
    status: str
    label: str
    count: int


class VehicleProfit(BaseModel):
    vehicle_id: str
    registration_number: str
    body_type: str | None = None
    status: str = "empty"
    trips_count: int = 0
    total_rent: float = 0.0
    total_spend: float = 0.0
    total_profit: float = 0.0
    avg_profit: float = 0.0


class DashboardResponse(BaseModel):
    kpis: DashboardKpis
    monthly: list[MonthlyProfitPoint]
    spend_breakdown: list[SpendSlice]
    status_breakdown: list[StatusSlice]
    top_vehicles: list[VehicleProfit]


class TripProfitRow(BaseModel):
    load_id: str
    route: str
    status: str
    start_date: str | None = None
    end_date: str | None = None
    rent: float = 0.0
    spend: float = 0.0
    profit: float = 0.0
