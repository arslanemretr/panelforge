from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PanelBounds:
    width: float
    height: float
    left_margin: float
    right_margin: float
    top_margin: float
    bottom_margin: float
    busbar_orientation: str | None
    phase_system: str | None
