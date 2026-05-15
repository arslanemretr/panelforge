from pydantic import BaseModel

from app.schemas.common import ORMModel


class PhaseTypeCreate(BaseModel):
    name: str
    phases: str  # "L1,L2,L3" — virgülle ayrılmış phase_labels.label değerleri


class PhaseTypeRead(ORMModel):
    id: int
    name: str
    phases: str
