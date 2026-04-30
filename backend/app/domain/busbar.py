from __future__ import annotations

from dataclasses import dataclass, field
from math import radians, tan

from app.domain.geometry import Point, Segment, Point3D, Segment3D


@dataclass
class Hole:
    x: float
    y: float
    diameter: float | None
    slot_width: float | None = None
    slot_length: float | None = None
    face: str | None = None          # front | back | left | right | top | bottom
    description: str | None = None


@dataclass
class Bend:
    distance_from_start: float
    angle_deg: float
    direction: str
    inner_radius: float
    k_factor: float = 0.33
    bend_allowance: float = 0.0
    bend_type: str = "flatwise"      # flatwise | edgewise
    bend_axis: str | None = None     # X | Y | Z
    description: str | None = None

    @classmethod
    def compute_allowance(
        cls,
        angle_deg: float,
        inner_radius: float,
        thickness: float,
        k_factor: float,
    ) -> float:
        """Bend allowance: BA = θ_rad × (R + K × t)"""
        theta = radians(abs(angle_deg))
        return theta * (inner_radius + k_factor * thickness)

    @classmethod
    def compute_deduction(
        cls,
        angle_deg: float,
        inner_radius: float,
        thickness: float,
        k_factor: float,
    ) -> float:
        """Bend deduction: BD = 2(R+t)·tan(θ/2) − BA"""
        theta = radians(abs(angle_deg))
        ba = cls.compute_allowance(angle_deg, inner_radius, thickness, k_factor)
        return 2.0 * (inner_radius + thickness) * tan(theta / 2.0) - ba


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
    segments: list[Segment3D] = field(default_factory=list)
    holes: list[Hole] = field(default_factory=list)
    bends: list[Bend] = field(default_factory=list)

    @property
    def straight_length(self) -> float:
        """Toplam geometrik uzunluk (segment başı-sonu arası 3D mesafeler toplamı)."""
        return sum(seg.length for seg in self.segments)

    @property
    def cut_length(self) -> float:
        """
        Kesim boyu = straight_length + bend deduction toplamı.
        Büküm deduction'ları straight_length'ten düşülür çünkü üst üste binen
        malzeme bükülme bölgesinde kıvrılır.
        Dikkat: bend_allowance zaten Bend objesine atanmış olmalıdır.
        """
        bd_total = 0.0
        for bend in self.bends:
            bd = Bend.compute_deduction(
                bend.angle_deg,
                bend.inner_radius,
                self.thickness,
                bend.k_factor,
            )
            bd_total += bd
        return max(0.0, self.straight_length - bd_total)

    def as_2d_segments(self) -> list[Segment]:
        """Geriye uyumluluk: 3D segmentleri 2D'ye düşür."""
        return [seg.as_2d() for seg in self.segments]
