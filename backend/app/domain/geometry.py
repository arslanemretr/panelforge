from __future__ import annotations

from dataclasses import dataclass
from math import hypot, sqrt


# ── 2D (geriye uyumluluk için korunuyor) ─────────────────────────────────────

@dataclass
class Point:
    x: float
    y: float


@dataclass
class Segment:
    start: Point
    end: Point

    @property
    def length(self) -> float:
        return hypot(self.end.x - self.start.x, self.end.y - self.start.y)


# ── 3D Vektör ─────────────────────────────────────────────────────────────────

@dataclass
class Vec3:
    x: float
    y: float
    z: float

    # ── Temel operasyonlar ────────────────────────────────────────────────────

    def __add__(self, other: Vec3) -> Vec3:
        return Vec3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other: Vec3) -> Vec3:
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, scalar: float) -> Vec3:
        return Vec3(self.x * scalar, self.y * scalar, self.z * scalar)

    def __rmul__(self, scalar: float) -> Vec3:
        return self.__mul__(scalar)

    def __neg__(self) -> Vec3:
        return Vec3(-self.x, -self.y, -self.z)

    # ── Geometrik işlemler ────────────────────────────────────────────────────

    def dot(self, other: Vec3) -> float:
        return self.x * other.x + self.y * other.y + self.z * other.z

    def cross(self, other: Vec3) -> Vec3:
        return Vec3(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )

    @property
    def length(self) -> float:
        return sqrt(self.x ** 2 + self.y ** 2 + self.z ** 2)

    def normalize(self) -> Vec3:
        n = self.length
        if n < 1e-9:
            return Vec3(0.0, 0.0, 0.0)
        return Vec3(self.x / n, self.y / n, self.z / n)

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)

    # ── Yardımcılar ───────────────────────────────────────────────────────────

    def is_zero(self, tol: float = 1e-6) -> bool:
        return self.length < tol

    def is_parallel(self, other: Vec3, tol: float = 1e-6) -> bool:
        """İki vektörün paralel (veya anti-paralel) olup olmadığını döndürür."""
        return self.cross(other).length < tol


# Eksen birim vektörleri — sabit referanslar
AXIS_X = Vec3(1.0, 0.0, 0.0)
AXIS_Y = Vec3(0.0, 1.0, 0.0)
AXIS_Z = Vec3(0.0, 0.0, 1.0)


# ── 3D Nokta ─────────────────────────────────────────────────────────────────

@dataclass
class Point3D:
    x: float
    y: float
    z: float

    def to_vec3(self) -> Vec3:
        return Vec3(self.x, self.y, self.z)

    def __add__(self, v: Vec3) -> Point3D:
        return Point3D(self.x + v.x, self.y + v.y, self.z + v.z)

    def __sub__(self, other: Point3D) -> Vec3:
        """İki nokta arası fark vektörü döndürür."""
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)

    def distance_to(self, other: Point3D) -> float:
        return (self - other).length

    def lerp(self, other: Point3D, t: float) -> Point3D:
        """Doğrusal interpolasyon: t=0 → self, t=1 → other."""
        return Point3D(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
        )

    def as_2d(self) -> Point:
        """Geriye uyumluluk için 2D noktaya dönüştür (Z düşürülür)."""
        return Point(self.x, self.y)


# ── 3D Segment ────────────────────────────────────────────────────────────────

@dataclass
class Segment3D:
    start: Point3D
    end: Point3D

    @property
    def length(self) -> float:
        return self.start.distance_to(self.end)

    @property
    def direction(self) -> Vec3:
        """Normalleştirilmiş yön vektörü (start → end)."""
        return (self.end - self.start).normalize()

    @property
    def vec(self) -> Vec3:
        """Normalleştirilmemiş fark vektörü."""
        return self.end - self.start

    def dominant_axis(self) -> str:
        """Segmentin en büyük bileşenini taşıyan ekseni döndürür: 'X', 'Y' veya 'Z'."""
        v = self.end - self.start
        ax, ay, az = abs(v.x), abs(v.y), abs(v.z)
        if ax >= ay and ax >= az:
            return "X"
        if ay >= az:
            return "Y"
        return "Z"

    def as_2d(self) -> Segment:
        """Geriye uyumluluk için 2D segmente dönüştür (Z düşürülür)."""
        return Segment(self.start.as_2d(), self.end.as_2d())


# ── Rijit dönüşüm yardımcıları ───────────────────────────────────────────────

def rotate_x(v: Vec3, angle_deg: float) -> Vec3:
    """X ekseni etrafında döndür."""
    from math import cos, sin, radians
    a = radians(angle_deg)
    return Vec3(
        v.x,
        v.y * cos(a) - v.z * sin(a),
        v.y * sin(a) + v.z * cos(a),
    )


def rotate_y(v: Vec3, angle_deg: float) -> Vec3:
    """Y ekseni etrafında döndür."""
    from math import cos, sin, radians
    a = radians(angle_deg)
    return Vec3(
        v.x * cos(a) + v.z * sin(a),
        v.y,
        -v.x * sin(a) + v.z * cos(a),
    )


def rotate_z(v: Vec3, angle_deg: float) -> Vec3:
    """Z ekseni etrafında döndür."""
    from math import cos, sin, radians
    a = radians(angle_deg)
    return Vec3(
        v.x * cos(a) - v.y * sin(a),
        v.x * sin(a) + v.y * cos(a),
        v.z,
    )


def rotate_xyz(v: Vec3, rx: float, ry: float, rz: float) -> Vec3:
    """
    Ardışık Rz * Ry * Rx dönüşümü uygula.
    Önce X ekseni, sonra Y, sonra Z ekseni etrafında döner.
    """
    v = rotate_x(v, rx)
    v = rotate_y(v, ry)
    v = rotate_z(v, rz)
    return v


def project_point_onto_segment(p: Point3D, seg_start: Point3D, seg_dir: Vec3, seg_length: float) -> Point3D:
    """
    p noktasını seg_start'tan seg_dir yönünde uzanan [0, seg_length] aralığındaki
    segment üzerine izdüşür.  Sonuç segment dışına çıkamaz (clamp uygulanır).
    """
    t = (p - seg_start).dot(seg_dir)
    t = max(0.0, min(t, seg_length))
    return seg_start + seg_dir * t
