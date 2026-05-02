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
    busbar_x_mm: Decimal | None = None
    busbar_y_mm: Decimal | None = None
    busbar_z_mm: Decimal | None = None
    busbar_orientation: str | None = "horizontal"
    busbar_length_mm: Decimal | None = None
    busbar_phase_count: int | None = 3
    bars_per_phase: int | None = 1
    bar_gap_mm: Decimal | None = Decimal("0")
    busbar_plane: str | None = "XY"
    phase_stack_axis: str | None = "Y"
    main_density_g_cm3: Decimal | None = None
    branch_density_g_cm3: Decimal | None = None
    k_factor_edgewise: Decimal | None = Decimal("0.40")
    busbar_clearance_mm: Decimal | None = None
    branch_clearance_mm: Decimal | None = None
    min_hole_hole_distance_mm: Decimal | None = None
    coating_type: str | None = None
    main_phase_center_mm: Decimal | None = None
    branch_phase_center_mm: Decimal | None = None
    main_copper_definition_id: int | None = None
    branch_copper_definition_id: int | None = None


class CopperSettingsUpsert(CopperSettingsBase):
    pass


class CopperSettingsRead(CopperSettingsBase, ORMModel):
    id: int
    project_id: int
