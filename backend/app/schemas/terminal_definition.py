from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel


class TerminalDefinitionBase(BaseModel):
    name: str
    terminal_type: str                          # "Ön Bakır Basmalı" | "Arka Yatay Taraklı" | "Yandan Taraklı"
    surface: str                                # "front" | "back" | "left" | "right" | "top" | "bottom"
    bolt_type: str | None = None
    bolt_count: int | None = None
    bolt_center_distance_mm: Decimal | None = None
    hole_diameter_mm: Decimal | None = None
    terminal_width_mm: Decimal | None = None
    terminal_height_mm: Decimal | None = None
    terminal_depth_mm: Decimal | None = None


class TerminalDefinitionCreate(TerminalDefinitionBase):
    pass


class TerminalDefinitionUpdate(TerminalDefinitionBase):
    pass


class TerminalDefinitionRead(TerminalDefinitionBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
