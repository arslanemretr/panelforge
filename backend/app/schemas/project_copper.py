from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.copper_definition import CopperDefinitionRead


class ProjectCopperCreate(BaseModel):
    copper_definition_id: int
    length_mm: Decimal
    quantity: int = 1


class ProjectCopperRead(ORMModel):
    id: int
    project_id: int
    copper_definition_id: int
    length_mm: Decimal
    quantity: int
    seq: int
    copper_definition: CopperDefinitionRead
