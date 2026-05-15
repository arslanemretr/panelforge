from pydantic import BaseModel

from app.schemas.common import ORMModel


class PhaseLabelCreate(BaseModel):
    label: str
    color: str


class PhaseLabelUpdate(BaseModel):
    color: str


class PhaseLabelRead(ORMModel):
    id: int
    label: str
    color: str
    is_system: bool
