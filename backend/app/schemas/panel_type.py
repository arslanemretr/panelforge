from pydantic import BaseModel

from app.schemas.common import ORMModel


class PanelTypeCreate(BaseModel):
    name: str


class PanelTypeRead(ORMModel):
    id: int
    name: str
