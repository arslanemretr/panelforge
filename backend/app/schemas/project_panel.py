from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.panel_definition import PanelDefinitionRead


class ProjectPanelCreate(BaseModel):
    panel_definition_id: int
    label: str | None = None
    quantity: int = 1


class ProjectPanelRead(ORMModel):
    id: int
    project_id: int
    panel_definition_id: int
    label: str | None = None
    seq: int
    quantity: int
    panel_definition: PanelDefinitionRead
