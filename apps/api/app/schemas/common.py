from pydantic import BaseModel


class Message(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    env: str
    db: str
