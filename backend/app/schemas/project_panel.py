from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.panel_definition import PanelDefinitionRead


class ProjectPanelCreate(BaseModel):
    panel_definition_id: int
    label: str | None = None
    quantity: int = 1


class ProjectPanelUpdate(BaseModel):
    """PATCH-style update: all fields optional."""
    label: str | None = None
    quantity: int | None = None
    width_mm: Decimal | None = None
    height_mm: Decimal | None = None
    depth_mm: Decimal | None = None
    mounting_plate_width_mm: Decimal | None = None
    mounting_plate_height_mm: Decimal | None = None
    left_margin_mm: Decimal | None = None
    right_margin_mm: Decimal | None = None
    top_margin_mm: Decimal | None = None
    bottom_margin_mm: Decimal | None = None
    busbar_orientation: str | None = None
    phase_system: str | None = None
    busbar_rail_offset_mm: Decimal | None = None
    busbar_end_setback_mm: Decimal | None = None
    origin_x_mm: Decimal | None = None
    origin_y_mm: Decimal | None = None
    origin_z_mm: Decimal | None = None


class ProjectPanelRead(ORMModel):
    id: int
    project_id: int
    panel_definition_id: int
    label: str | None = None
    seq: int
    quantity: int
    # Project-specific geometry
    width_mm: Decimal
    height_mm: Decimal
    depth_mm: Decimal | None = None
    mounting_plate_width_mm: Decimal | None = None
    mounting_plate_height_mm: Decimal | None = None
    left_margin_mm: Decimal
    right_margin_mm: Decimal
    top_margin_mm: Decimal
    bottom_margin_mm: Decimal
    busbar_orientation: str | None = None
    phase_system: str | None = None
    busbar_rail_offset_mm: Decimal | None = None
    busbar_end_setback_mm: Decimal | None = None
    origin_x_mm: Decimal
    origin_y_mm: Decimal
    origin_z_mm: Decimal
    panel_definition: PanelDefinitionRead
