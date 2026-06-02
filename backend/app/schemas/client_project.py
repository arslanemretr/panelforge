from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.firm import FirmRead


class ClientProjectCreate(BaseModel):
    firm_id: int
    code: str | None = None
    name: str


class ClientProjectUpdate(BaseModel):
    firm_id: int
    code: str | None = None
    name: str


class ClientProjectRead(ORMModel):
    id: int
    firm_id: int
    code: str | None = None
    name: str
    created_at: datetime
    updated_at: datetime
    firm: FirmRead


class ClientProjectBrief(ORMModel):
    """Proje listesinde ProjectRead içinde kullanılmak üzere hafif versiyon."""
    id: int
    firm_id: int
    code: str | None = None
    name: str
    firm: FirmRead
