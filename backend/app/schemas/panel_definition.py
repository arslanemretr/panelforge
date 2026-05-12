from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.panel_type import PanelTypeRead


class PanelDefinitionBase(BaseModel):
    name: str
    description: str | None = None
    width_mm: Decimal
    height_mm: Decimal
    depth_mm: Decimal | None = None
    mounting_plate_width_mm: Decimal | None = None
    mounting_plate_height_mm: Decimal | None = None
    left_margin_mm: Decimal = Decimal("0")
    right_margin_mm: Decimal = Decimal("0")
    top_margin_mm: Decimal = Decimal("0")
    bottom_margin_mm: Decimal = Decimal("0")
    busbar_orientation: str | None = None
    phase_system: str | None = None
    busbar_rail_offset_mm: Decimal | None = Decimal("100")
    busbar_end_setback_mm: Decimal | None = Decimal("60")
    panel_type_id: int | None = None
    origin_x_mm: Decimal = Decimal("0")
    origin_y_mm: Decimal = Decimal("0")
    origin_z_mm: Decimal = Decimal("0")


class PanelDefinitionCreate(PanelDefinitionBase):
    pass


class PanelDefinitionUpdate(PanelDefinitionBase):
    pass


class PanelDefinitionRead(PanelDefinitionBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
    panel_type: PanelTypeRead | None = None
