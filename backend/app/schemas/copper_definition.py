from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CopperDefinitionBase(BaseModel):
    name: str
    copper_kind: str = "main"
    description: str | None = None
    main_width_mm: Decimal | None = None
    main_thickness_mm: Decimal | None = None
    main_material: str = "Cu"
    main_phase_spacing_mm: Decimal | None = None
    branch_width_mm: Decimal | None = None
    branch_thickness_mm: Decimal | None = None
    branch_material: str = "Cu"
    branch_phase_spacing_mm: Decimal | None = None
    bend_inner_radius_mm: Decimal | None = None
    k_factor: Decimal | None = Decimal("0.33")
    min_hole_edge_distance_mm: Decimal | None = None
    min_bend_hole_distance_mm: Decimal | None = None
    default_hole_diameter_mm: Decimal | None = None
    use_slot_holes: bool = False
    slot_width_mm: Decimal | None = None
    slot_length_mm: Decimal | None = None
    density_g_cm3: Decimal | None = None
    coating_type: str | None = None
    busbar_x_mm: Decimal | None = None
    busbar_y_mm: Decimal | None = None
    busbar_z_mm: Decimal | None = None
    busbar_orientation: str | None = None
    busbar_length_mm: Decimal | None = None


class CopperDefinitionCreate(CopperDefinitionBase):
    pass


class CopperDefinitionUpdate(CopperDefinitionBase):
    pass


class CopperDefinitionRead(CopperDefinitionBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
