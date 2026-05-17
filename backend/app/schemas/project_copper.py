from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.copper_definition import CopperDefinitionRead
from app.schemas.phase_type import PhaseTypeRead


class ProjectCopperCreate(BaseModel):
    copper_definition_id: int
    length_mm: Decimal
    quantity: int = 1


class ProjectCopperUpdate(BaseModel):
    length_mm: Decimal | None = None
    quantity: int | None = None
    main_width_mm: Decimal | None = None
    main_thickness_mm: Decimal | None = None
    busbar_x_mm: Decimal | None = None
    busbar_y_mm: Decimal | None = None
    busbar_z_mm: Decimal | None = None
    busbar_orientation: str | None = None
    phase_type_id: int | None = None
    bars_per_phase: int | None = None
    bar_gap_mm: Decimal | None = None
    phase_center_mm: Decimal | None = None
    layer_type: str | None = None
    neutral_bar_count: int | None = None


class ProjectCopperRead(ORMModel):
    id: int
    project_id: int
    copper_definition_id: int
    length_mm: Decimal
    quantity: int
    seq: int
    copper_definition: CopperDefinitionRead

    # Proje özgü geometri
    main_width_mm: Decimal | None = None
    main_thickness_mm: Decimal | None = None
    busbar_x_mm: Decimal | None = None
    busbar_y_mm: Decimal | None = None
    busbar_z_mm: Decimal | None = None
    busbar_orientation: str | None = None
    phase_type_id: int | None = None
    phase_type: PhaseTypeRead | None = None
    bars_per_phase: int | None = None
    bar_gap_mm: Decimal | None = None
    phase_center_mm: Decimal | None = None
    layer_type: str | None = None
    neutral_bar_count: int | None = None
