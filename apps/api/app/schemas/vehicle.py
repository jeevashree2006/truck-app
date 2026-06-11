from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import AxleType, BodyType, DocStatus, DocumentType, VehicleStatus


class DocumentInfo(BaseModel):
    number: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    doc_url: str | None = None  # legacy single scan
    doc_urls: list[str] = Field(default_factory=list)  # uploaded pages (1–2)


class DocumentStatus(BaseModel):
    """A document plus its computed colour-coded status and progress."""

    type: DocumentType
    number: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    doc_url: str | None = None
    doc_urls: list[str] = Field(default_factory=list)
    status: DocStatus
    days_to_expiry: int | None = None
    progress: float | None = None


class VehicleBase(BaseModel):
    registration_number: str = Field(min_length=2, max_length=20)
    axle_type: AxleType = AxleType.multi
    length_feet: int | None = Field(default=None, ge=8, le=60)   # e.g. 20, 32
    body_type: BodyType = BodyType.container
    # Manufacture / registration month as "YYYY-MM"; age is derived from this.
    manufacture_month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    age_years: int | None = Field(default=None, ge=0, le=60)
    chassis_number: str | None = Field(default=None, max_length=40)
    make: str | None = None
    model: str | None = None
    photo_url: str | None = None
    documents: dict[DocumentType, DocumentInfo] = Field(default_factory=dict)


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: str | None = Field(default=None, min_length=2, max_length=20)
    axle_type: AxleType | None = None
    length_feet: int | None = Field(default=None, ge=8, le=60)
    body_type: BodyType | None = None
    manufacture_month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    age_years: int | None = Field(default=None, ge=0, le=60)
    chassis_number: str | None = Field(default=None, max_length=40)
    make: str | None = None
    model: str | None = None
    photo_url: str | None = None
    status: VehicleStatus | None = None
    documents: dict[DocumentType, DocumentInfo] | None = None


class StatusUpdate(BaseModel):
    status: VehicleStatus


class VehicleOut(VehicleBase):
    id: str
    owner_id: str
    status: VehicleStatus = VehicleStatus.empty
    active_load_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # Computed / enriched:
    document_statuses: list[DocumentStatus] = Field(default_factory=list)
    overall_doc_status: DocStatus = DocStatus.unknown
    trips_count: int = 0
    total_profit: float = 0.0
