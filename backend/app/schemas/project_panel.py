from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.panel_definition import PanelDefinitionRead


class ProjectPanelCreate(BaseModel):
    panel_definition_id: int
    label: str | None = None


class ProjectPanelRead(ORMModel):
    id: int
    project_id: int
    panel_definition_id: int
    label: str | None = None
    seq: int
    panel_definition: PanelDefinitionRead
