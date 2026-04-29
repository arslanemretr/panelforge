from decimal import Decimal

from pydantic import BaseModel, Field


class ValidationResult(BaseModel):
    can_calculate: bool
    missing_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class SummaryRead(BaseModel):
    main_busbar_count: int
    branch_busbar_count: int
    total_cut_length_mm: Decimal
    total_hole_count: int
    total_bend_count: int


class SegmentRead(BaseModel):
    seq: int
    start_x_mm: Decimal
    start_y_mm: Decimal
    end_x_mm: Decimal
    end_y_mm: Decimal


class HoleRead(BaseModel):
    hole_no: int
    x_mm: Decimal
    y_mm: Decimal
    diameter_mm: Decimal | None = None
    slot_width_mm: Decimal | None = None
    slot_length_mm: Decimal | None = None
    description: str | None = None


class BendRead(BaseModel):
    bend_no: int
    distance_from_start_mm: Decimal
    angle_deg: Decimal
    direction: str
    inner_radius_mm: Decimal
    description: str | None = None


class BusbarRead(BaseModel):
    id: int
    part_no: str
    name: str
    busbar_type: str
    phase: str
    connected_device_label: str | None = None
    width_mm: Decimal
    thickness_mm: Decimal
    material: str
    quantity: int
    cut_length_mm: Decimal
    segments: list[SegmentRead] = Field(default_factory=list)
    holes: list[HoleRead] = Field(default_factory=list)
    bends: list[BendRead] = Field(default_factory=list)


class CalculationResponse(BaseModel):
    status: str
    project_id: int
    summary: SummaryRead


class CalculationResults(BaseModel):
    summary: SummaryRead
    busbars: list[BusbarRead]
    warnings: list[str] = Field(default_factory=list)
