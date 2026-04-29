from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CopperSettingsBase(BaseModel):
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
    # Ana bakır yerleşim
    busbar_x_mm: Decimal | None = None
    busbar_y_mm: Decimal | None = None
    busbar_z_mm: Decimal | None = None
    busbar_orientation: str | None = "horizontal"
    busbar_length_mm: Decimal | None = None
    busbar_phase_count: int | None = 3


class CopperSettingsUpsert(CopperSettingsBase):
    pass


class CopperSettingsRead(CopperSettingsBase, ORMModel):
    id: int
    project_id: int
