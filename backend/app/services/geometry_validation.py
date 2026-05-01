"""
geometry_validation.py

Hesaplama sonrası geometrik tutarlılık kontrolleri.
Tüm fonksiyonlar uyarı metni listesi döndürür; boş liste = sorun yok.

Kontroller:
  1. Tali bara çakışması  — branch çiftleri busbar_clearance_mm / branch_clearance_mm'den
     yakın ise uyarı
  2. Ana bara delik aralığı — ardışık delikler min_hole_hole_distance_mm'den yakın ise uyarı
  3. Ana bara delik-kenar  — delik merkezi bar ucuna min_hole_edge_distance_mm'den yakın ise uyarı
"""

from __future__ import annotations

from app.db import models

# ── AABB yardımcıları ─────────────────────────────────────────────────────────

type AABB = tuple[float, float, float, float, float, float]
# (min_x, min_y, min_z, max_x, max_y, max_z)


def _busbar_aabb(busbar: models.Busbar) -> AABB | None:
    """Busbarın 3D AABB'sini döndürür. Segment yoksa None."""
    pts: list[tuple[float, float, float]] = []
    for seg in busbar.segments:
        pts.append((float(seg.start_x_mm), float(seg.start_y_mm), float(seg.start_z_mm or 0)))
        pts.append((float(seg.end_x_mm),   float(seg.end_y_mm),   float(seg.end_z_mm   or 0)))

    if not pts:
        return None

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    zs = [p[2] for p in pts]

    # Bakırın yarı genişliği her yönde kutuyu dışa taşır
    hw = float(busbar.width_mm) / 2.0
    ht = float(busbar.thickness_mm) / 2.0

    return (
        min(xs) - hw, min(ys) - hw, min(zs) - ht,
        max(xs) + hw, max(ys) + hw, max(zs) + ht,
    )


def _aabb_violates_clearance(a: AABB, b: AABB, clearance: float) -> bool:
    """
    İki AABB arasındaki boşluk 'clearance'dan küçükse True döner
    (çakışma durumu dahil — negatif boşluk).
    """
    # Her eksende birbirlerinden en az clearance kadar ayrı olup olmadığını kontrol et
    if a[3] + clearance <= b[0]:  return False   # a sağında b
    if b[3] + clearance <= a[0]:  return False   # b sağında a
    if a[4] + clearance <= b[1]:  return False   # a üstünde b
    if b[4] + clearance <= a[1]:  return False   # b üstünde a
    if a[5] + clearance <= b[2]:  return False   # a arkasında b
    if b[5] + clearance <= a[2]:  return False   # b arkasında a
    return True


# ── Ana kontrol fonksiyonları ─────────────────────────────────────────────────

def check_busbar_clearances(
    busbars: list[models.Busbar],
    copper: models.CopperSettings,
) -> list[str]:
    """
    Bara çiftleri arasındaki mesafeyi clearance eşikleriyle karşılaştırır.

    • main ↔ branch : busbar_clearance_mm kullanılır
    • branch ↔ branch: branch_clearance_mm kullanılır
    • main ↔ main   : aynı fazdan paralel barlar için kontrol edilmez
                       (kasıtlı olarak çok yakın yerleştirilirler)
    """
    warnings: list[str] = []

    main_clearance   = float(copper.busbar_clearance_mm  or 0)
    branch_clearance = float(copper.branch_clearance_mm  or 0)

    if main_clearance <= 0 and branch_clearance <= 0:
        return warnings   # Eşik tanımlanmamış → kontrol yok

    mains    = [b for b in busbars if b.busbar_type == "main"]
    branches = [b for b in busbars if b.busbar_type == "branch"]

    aabb_cache: dict[int, AABB | None] = {}

    def _get(b: models.Busbar) -> AABB | None:
        if b.id not in aabb_cache:
            aabb_cache[b.id] = _busbar_aabb(b)
        return aabb_cache[b.id]

    # main ↔ branch
    if main_clearance > 0:
        for m in mains:
            m_aabb = _get(m)
            if m_aabb is None:
                continue
            for br in branches:
                if br.phase != m.phase:
                    continue  # sadece aynı faz çifti kontrol edilir
                br_aabb = _get(br)
                if br_aabb is None:
                    continue
                if _aabb_violates_clearance(m_aabb, br_aabb, main_clearance):
                    warnings.append(
                        f"Bogaz ihlali: {m.part_no} ↔ {br.part_no} "
                        f"(min {main_clearance:.1f} mm)"
                    )

    # branch ↔ branch
    if branch_clearance > 0:
        for i, br1 in enumerate(branches):
            a1 = _get(br1)
            if a1 is None:
                continue
            for br2 in branches[i + 1:]:
                a2 = _get(br2)
                if a2 is None:
                    continue
                if _aabb_violates_clearance(a1, a2, branch_clearance):
                    warnings.append(
                        f"Tali bara bogaz ihlali: {br1.part_no} ↔ {br2.part_no} "
                        f"(min {branch_clearance:.1f} mm)"
                    )

    return warnings


def check_hole_spacing(
    busbars: list[models.Busbar],
    copper: models.CopperSettings,
) -> list[str]:
    """
    Ana bakır üzerindeki delik-delik ve delik-kenar mesafelerini kontrol eder.

    • Ardışık delikler: min_hole_hole_distance_mm
    • Delik-bar başı/sonu: min_hole_edge_distance_mm
    """
    warnings: list[str] = []

    min_hh   = float(copper.min_hole_hole_distance_mm or 0)
    min_edge = float(copper.min_hole_edge_distance_mm or 0)

    mains = [b for b in busbars if b.busbar_type == "main"]

    for bar in mains:
        holes_x = sorted(float(h.x_mm) for h in bar.holes)
        bar_len  = float(bar.cut_length_mm)

        if min_hh > 0:
            for i in range(len(holes_x) - 1):
                gap = holes_x[i + 1] - holes_x[i]
                if gap < min_hh:
                    warnings.append(
                        f"{bar.part_no}: Delik araligi {gap:.1f} mm < min {min_hh:.1f} mm "
                        f"(delik {i + 1}-{i + 2})"
                    )

        if min_edge > 0 and holes_x:
            dist_start = holes_x[0]
            dist_end   = bar_len - holes_x[-1]
            if dist_start < min_edge:
                warnings.append(
                    f"{bar.part_no}: Ilk delik bar basina {dist_start:.1f} mm yakın "
                    f"(min {min_edge:.1f} mm)"
                )
            if dist_end < min_edge:
                warnings.append(
                    f"{bar.part_no}: Son delik bar sonuna {dist_end:.1f} mm yakın "
                    f"(min {min_edge:.1f} mm)"
                )

    return warnings


def run_all_checks(
    busbars: list[models.Busbar],
    copper: models.CopperSettings,
) -> list[str]:
    """Tüm geometri doğrulama kontrollerini çalıştırır ve birleşik uyarı listesi döner."""
    warnings: list[str] = []
    warnings.extend(check_busbar_clearances(busbars, copper))
    warnings.extend(check_hole_spacing(busbars, copper))
    return warnings
