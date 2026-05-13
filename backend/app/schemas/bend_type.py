from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


# ── BendParameter ─────────────────────────────────────────────────────────────

class BendParameterBase(BaseModel):
    order_no: int
    name: str                           # "A1", "B", "C"
    label: str                          # "Alt Ayak Uzunluğu"
    default_value: Decimal = Decimal("0")
    formula: str | None = None          # hesaplananlar: "A1+A2"
    is_calculated: bool = False


class BendParameterCreate(BendParameterBase):
    pass


class BendParameterRead(BendParameterBase, ORMModel):
    id: int
    bend_type_id: int


# ── BendSegment ───────────────────────────────────────────────────────────────

class BendSegmentBase(BaseModel):
    order_no: int
    label: str                          # "A1 Kolu", "Yatay B"
    length_expr: str                    # "A1", "A1+A2", "B+25"
    angle_from_prev: Decimal = Decimal("0")   # 0=düz, +90=sola, -90=sağa


class BendSegmentCreate(BendSegmentBase):
    pass


class BendSegmentRead(BendSegmentBase, ORMModel):
    id: int
    bend_type_id: int


# ── BendType ──────────────────────────────────────────────────────────────────

class BendTypeBase(BaseModel):
    name: str
    description: str | None = None
    template_type: str = "Özel"         # "Z"|"ZL"|"Tip-1"|"Tip-2"|"Özel"
    thickness_mm: Decimal = Decimal("5")
    parallel_count: int = 1             # 1-4
    start_direction: str = "up"         # "up"|"right"


class BendTypeCreate(BendTypeBase):
    parameters: list[BendParameterCreate] = Field(default_factory=list)
    segments: list[BendSegmentCreate] = Field(default_factory=list)


class BendTypeUpdate(BendTypeBase):
    parameters: list[BendParameterCreate] = Field(default_factory=list)
    segments: list[BendSegmentCreate] = Field(default_factory=list)


class BendTypeRead(BendTypeBase, ORMModel):
    id: int
    parameters: list[BendParameterRead] = Field(default_factory=list)
    segments: list[BendSegmentRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class BendTypeListItem(BendTypeBase, ORMModel):
    """Liste görünümü — parameters/segments dahil değil (lightweight)."""
    id: int
    bend_count: int = 0    # frontend'e kolaylık: len(segments)
    created_at: datetime
    updated_at: datetime
