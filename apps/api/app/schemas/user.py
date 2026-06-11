from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserPublic(BaseModel):
    id: str
    name: str | None = None
    email: EmailStr | None = None
    mobile: str | None = None
    language: str = "en"
    theme: str = "system"
    created_at: datetime | None = None


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    email: EmailStr | None = None
    mobile: str | None = Field(default=None, max_length=20)
    language: str | None = Field(default=None, pattern="^(en|ta|hi)$")
    theme: str | None = Field(default=None, pattern="^(light|dark|system)$")


class PushTokenIn(BaseModel):
    token: str
