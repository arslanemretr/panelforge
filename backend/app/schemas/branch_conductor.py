from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.bend_type import BendTypeRead
from app.schemas.common import ORMModel


# ── Nested özetler ────────────────────────────────────────────────────────────
class DeviceSummary(ORMModel):
    id: int
    brand: str
    model: str
    device_type: str


class CopperSummary(ORMModel):
    id: int
    name: str
    branch_width_mm: Decimal | None = None
    branch_thickness_mm: Decimal | None = None
    branch_material: str = "Cu"


class BendTypeSummary(ORMModel):
    id: int
    name: str
    template_type: str
    thickness_mm: Decimal
    parallel_count: int
    start_direction: str


# ── Create / Update ────────────────────────────────────────────────────────────
class BranchConductorCreate(BaseModel):
    name: str
    description: str | None = None
    conductor_kind: str = "dahili"           # "dahili" | "harici"

    copper_definition_id: int | None = None
    thickness_mm: Decimal | None = None
    width_mm: Decimal | None = None

    bend_type_id: int | None = None

    device_id: int | None = None
    terminal_label: str | None = None

    phase: str | None = None
    parallel_count: int = 1

    start_point: str | None = None
    end_point: str | None = None


class BranchConductorUpdate(BranchConductorCreate):
    pass


# ── Read (liste — hafif) ───────────────────────────────────────────────────────
class BranchConductorListItem(ORMModel):
    id: int
    name: str
    description: str | None = None
    conductor_kind: str
    phase: str | None = None
    parallel_count: int
    terminal_label: str | None = None
    start_point: str | None = None
    end_point: str | None = None
    created_at: datetime
    updated_at: datetime

    copper_definition: CopperSummary | None = None
    bend_type: BendTypeSummary | None = None
    device: DeviceSummary | None = None


# ── Read (tam detay) ───────────────────────────────────────────────────────────
class BranchConductorRead(ORMModel):
    id: int
    name: str
    description: str | None = None
    conductor_kind: str
    copper_definition_id: int | None = None
    thickness_mm: Decimal | None = None
    width_mm: Decimal | None = None
    bend_type_id: int | None = None
    device_id: int | None = None
    terminal_label: str | None = None
    phase: str | None = None
    parallel_count: int
    start_point: str | None = None
    end_point: str | None = None
    created_at: datetime
    updated_at: datetime

    copper_definition: CopperSummary | None = None
    bend_type: BendTypeRead | None = None
    device: DeviceSummary | None = None
