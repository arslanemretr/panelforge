from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.geometry import Point, Segment


@dataclass
class Hole:
    x: float
    y: float
    diameter: float | None
    slot_width: float | None = None
    slot_length: float | None = None
    description: str | None = None


@dataclass
class Bend:
    distance_from_start: float
    angle_deg: float
    direction: str
    inner_radius: float
    k_factor: float = 0.33
    bend_allowance: float = 0.0
    description: str | None = None


@dataclass
class BusbarPart:
    part_no: str
    name: str
    busbar_type: str
    phase: str
    width: float
    thickness: float
    material: str
    quantity: int
    connected_device_label: str | None
    segments: list[Segment] = field(default_factory=list)
    holes: list[Hole] = field(default_factory=list)
    bends: list[Bend] = field(default_factory=list)

    @property
    def straight_length(self) -> float:
        return sum(segment.length for segment in self.segments)
