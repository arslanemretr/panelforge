from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DeviceTerminalPoint:
    terminal_name: str
    phase: str
    x: float
    y: float
    hole_diameter: float | None
    slot_width: float | None
    slot_length: float | None
