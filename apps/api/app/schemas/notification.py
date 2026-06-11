from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    id: str
    owner_id: str
    type: NotificationType
    title: str
    body: str
    vehicle_id: str | None = None
    read: bool = False
    created_at: datetime | None = None
