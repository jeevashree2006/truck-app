from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "Fleet Owner API"
    env: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006"

    # MySQL. Either set DATABASE_URL directly (a SQLAlchemy async DSN such as
    # mysql+asyncmy://user:pass@host:3306/fleet) or the individual MYSQL_* parts below.
    database_url: str = ""
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_db: str = "fleet"
    # Managed free MySQL (TiDB Serverless, Aiven, PlanetScale) require TLS — set DB_SSL=true.
    db_ssl: bool = False

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # OTP
    otp_length: int = 6
    otp_expire_minutes: int = 10
    otp_max_attempts: int = 5

    # Documents
    doc_expiring_soon_days: int = 30

    # Email. Two free ways to send real emails:
    #  1) SMTP (Gmail etc.) via Python's stdlib smtplib — set SMTP_USER + SMTP_PASSWORD.
    #  2) SendGrid API — set SENDGRID_API_KEY.
    email_from: str = "no-reply@fleetowner.app"
    email_from_name: str = "Fleet Owner"
    # SMTP (e.g. Gmail: host=smtp.gmail.com, port=587, user=you@gmail.com,
    # password=16-char App Password from https://myaccount.google.com/apppasswords)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    # SendGrid (alternative)
    sendgrid_api_key: str = ""

    @property
    def has_email_provider(self) -> bool:
        return bool((self.smtp_user and self.smtp_password) or self.sendgrid_api_key)

    # SMS. If none configured, OTP SMS is logged to console (dev mode).
    # Fast2SMS (India; easiest — OTP route needs no DLT template):
    fast2sms_api_key: str = ""
    # Twilio (works internationally):
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from: str = ""  # e.g. +1xxxxxxxxxx
    # MSG91 (India; needs DLT-approved flow/template):
    msg91_auth_key: str = ""
    msg91_flow_id: str = ""
    msg91_sender: str = "FLEET"
    # Generic fallback provider:
    sms_api_key: str = ""
    sms_api_url: str = ""
    sms_sender: str = "FLEET"

    @property
    def has_sms_provider(self) -> bool:
        return bool(
            self.fast2sms_api_key
            or (self.twilio_account_sid and self.twilio_auth_token and self.twilio_from)
            or self.msg91_auth_key
            or self.sms_api_key
        )

    # Push (Expo)
    expo_access_token: str = ""

    @property
    def sqlalchemy_url(self) -> str:
        """Async SQLAlchemy DSN. Uses DATABASE_URL if set, else builds from MYSQL_* parts.

        Always forces the async `asyncmy` driver — managed providers (TiDB, Aiven,
        PlanetScale) hand out plain `mysql://...` DSNs, which would otherwise make
        SQLAlchemy try the sync `MySQLdb`/`pymysql` driver and crash.
        """
        if self.database_url:
            url = self.database_url.strip()
            # Drop URL query params (TiDB/Aiven append ?ssl_ca=…&ssl_mode=… which asyncmy
            # rejects) — TLS is handled by DB_SSL + the engine's connect_args instead.
            url = url.split("?", 1)[0]
            for prefix in ("mysql+pymysql://", "mysql+mysqldb://", "mysql+mysqlconnector://", "mysql://"):
                if url.startswith(prefix):
                    return "mysql+asyncmy://" + url[len(prefix):]
            return url
        from urllib.parse import quote_plus

        pwd = quote_plus(self.mysql_password)
        return (
            f"mysql+asyncmy://{self.mysql_user}:{pwd}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.env.lower() in {"dev", "development", "local"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
