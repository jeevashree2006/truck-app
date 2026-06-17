from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import TripStatus


class MoneyEntry(BaseModel):
    """A single money line — diesel fill, driver advance, or freight payment."""

    amount: float = Field(ge=0)
    note: str | None = Field(default=None, max_length=120)
    at: date | None = None


class LegBase(BaseModel):
    # Empty by default: "New Load" creates a blank leg the owner fills in later in the editor.
    loading_point: str = Field(default="", max_length=120)
    unloading_point: str = Field(default="", max_length=120)
    total_rent: float = Field(default=0, ge=0)
    commission: list[MoneyEntry] = Field(default_factory=list)  # transport commission(s)
    driver_salary: float = Field(default=0, ge=0)
    fastag: list[MoneyEntry] = Field(default_factory=list)   # multiple toll/FASTag entries
    diesel: list[MoneyEntry] = Field(default_factory=list)   # multiple fills
    advance: list[MoneyEntry] = Field(default_factory=list)  # multiple advances
    # Freight payments received from the transporter/company FOR THIS LEG (advance at
    # loading, balance after unload). Tracked per leg since each load can be a different party.
    freight_payments: list[MoneyEntry] = Field(default_factory=list)


class LegOut(LegBase):
    # Computed per-leg figures.
    diesel_total: float = 0.0
    advance_total: float = 0.0
    fastag_total: float = 0.0
    commission_total: float = 0.0
    spend: float = 0.0      # diesel + commission + driver_salary + fastag + advance
    profit: float = 0.0     # total_rent - spend
    freight_received: float = 0.0          # payments received for this leg
    freight_pending: float = 0.0           # total_rent - freight_received (>=0)
    freight_fully_paid: bool = False


class LoadTotals(BaseModel):
    total_rent: float = 0.0
    total_diesel: float = 0.0
    total_commission: float = 0.0
    total_salary: float = 0.0
    total_fastag: float = 0.0
    total_advance: float = 0.0     # part of spend
    spend: float = 0.0             # diesel + commission + salary + fastag + advance
    profit: float = 0.0            # total_rent - spend
    leg_count: int = 0
    # Driver settlement: balance the driver should return = advance - cash spent.
    expected_driver_balance: float = 0.0
    # Freight receivable across all legs (sum of per-leg freight payments).
    freight_received: float = 0.0          # sum received across legs
    freight_pending: float = 0.0           # total_rent - freight_received (>=0)
    freight_fully_paid: bool = False


class LoadCreate(BaseModel):
    vehicle_id: str
    start_date: date | None = None
    notes: str | None = None
    legs: list[LegBase] = Field(default_factory=list)


class LoadUpdate(BaseModel):
    start_date: date | None = None
    notes: str | None = None
    legs: list[LegBase] | None = None  # full replacement of the legs array (carries per-leg freight_payments)


class CloseTrip(BaseModel):
    accounts_image_url: str | None = None  # "kanakku sheet" photo
    driver_balance: float | None = Field(default=None, ge=0)  # cash returned by driver
    end_date: date | None = None
    # Odometer + fuel captured at close → trip mileage (km per litre).
    start_km: float | None = Field(default=None, ge=0)
    end_km: float | None = Field(default=None, ge=0)
    fuel_litres: float | None = Field(default=None, ge=0)


class LoadOut(BaseModel):
    id: str
    owner_id: str
    vehicle_id: str
    vehicle_registration: str | None = None
    status: TripStatus = TripStatus.ongoing
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    legs: list[LegOut] = Field(default_factory=list)
    accounts_image_url: str | None = None
    driver_balance: float | None = None
    # Odometer + fuel + derived mileage (km/litre); set when the trip is closed.
    start_km: float | None = None
    end_km: float | None = None
    fuel_litres: float | None = None
    mileage: float | None = None
    totals: LoadTotals = Field(default_factory=LoadTotals)
    created_at: datetime | None = None
    closed_at: datetime | None = None
    # Convenience route summary e.g. "Namakkal → Mumbai → Madurai"
    route: str | None = None
