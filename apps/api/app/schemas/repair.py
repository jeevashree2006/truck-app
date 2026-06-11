from datetime import date as DateType
from datetime import datetime

from pydantic import BaseModel, Field

# Note: the field is named `date`, which would shadow the imported `date` type during
# Pydantic's annotation resolution — so we alias the type as `DateType`.


class RepairBase(BaseModel):
    vehicle_id: str
    date: DateType
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(default=0, ge=0)
    vendor: str | None = Field(default=None, max_length=120)
    odometer_km: int | None = Field(default=None, ge=0)


class RepairCreate(RepairBase):
    pass


class RepairUpdate(BaseModel):
    date: DateType | None = None
    description: str | None = Field(default=None, min_length=1, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    vendor: str | None = Field(default=None, max_length=120)
    odometer_km: int | None = Field(default=None, ge=0)


class RepairOut(RepairBase):
    id: str
    owner_id: str
    vehicle_registration: str | None = None
    created_at: datetime | None = None
