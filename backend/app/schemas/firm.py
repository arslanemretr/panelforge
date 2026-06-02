from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class FirmCreate(BaseModel):
    name: str
    vkn: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class FirmUpdate(FirmCreate):
    pass


class FirmRead(FirmCreate, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
