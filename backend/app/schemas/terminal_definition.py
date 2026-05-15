from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMModel


class TerminalDefinitionBase(BaseModel):
    name: str
    terminal_type: str                          # "Ön Bakır Basmalı" | "Arka Yatay Taraklı" | "Arka Yatay Terminal" | "Yandan Taraklı" | "Kablo Pabuçlu"
    surface: str                                # "front" | "back" | "left" | "right" | "top" | "bottom"
    bolt_type: str | None = None
    bolt_count: int | None = None
    bolt_center_distance_mm: Decimal | None = None
    hole_diameter_mm: Decimal | None = None     # yuvarlak delik çapı
    slot_width_mm: Decimal | None = None        # slot delik genişliği
    slot_length_mm: Decimal | None = None       # slot delik uzunluğu
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
