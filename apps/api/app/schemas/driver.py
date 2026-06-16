from datetime import datetime

from pydantic import BaseModel, Field


class MobileEntry(BaseModel):
    number: str = Field(min_length=4, max_length=20)
    primary: bool = False


class DriverBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    mobiles: list[MobileEntry] = Field(default_factory=list)
    licence_number: str | None = Field(default=None, max_length=40)
    licence_image_url: str | None = None


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    mobiles: list[MobileEntry] | None = None
    licence_number: str | None = Field(default=None, max_length=40)
    licence_image_url: str | None = None


class AssignVehicle(BaseModel):
    # vehicle_id => assign + go active ("on trip"); None => leaving the vehicle (inactive).
    vehicle_id: str | None = None


class SetAdvance(BaseModel):
    advance_amount: float = Field(ge=0)


class DriverOut(DriverBase):
    id: str
    owner_id: str
    status: str = "inactive"  # active | inactive
    assigned_vehicle_id: str | None = None
    assigned_vehicle_registration: str | None = None
    primary_mobile: str | None = None
    advance_amount: float = 0.0
    created_at: datetime | None = None
    updated_at: datetime | None = None
