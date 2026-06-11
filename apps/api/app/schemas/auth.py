from pydantic import BaseModel, EmailStr, Field


class RequestOTP(BaseModel):
    # Email address or mobile number — the backend detects the channel.
    identifier: str = Field(min_length=3, max_length=120)
    name: str | None = Field(default=None, max_length=80)
    # True when creating a new account; False (login) requires an existing account.
    signup: bool = False


class VerifyOTP(BaseModel):
    identifier: str = Field(min_length=3, max_length=120)
    code: str = Field(min_length=4, max_length=8)
    # Optional profile details captured on first sign-up.
    name: str | None = Field(default=None, max_length=80)
    email: EmailStr | None = None
    mobile: str | None = Field(default=None, max_length=20)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class OTPRequested(BaseModel):
    message: str
    channel: str  # 'email' | 'sms'
    # In dev mode (no SendGrid/SMS provider) the code is returned for testing.
    dev_code: str | None = None
