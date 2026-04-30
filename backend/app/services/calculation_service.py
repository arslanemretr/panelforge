from __future__ import annotations

from decimal import Decimal
from math import radians, tan

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.db import models
from app.domain.busbar import Bend, BusbarPart, Hole
from app.domain.geometry import (
    Point3D,
    Segment3D,
    Vec3,
    project_point_onto_segment,
    rotate_xyz,
)
from app.schemas.calculation import BusbarRead, CalculationResponse, CalculationResults, SummaryRead
from app.services.validation_service import validate_project


PHASES_BY_SYSTEM = {
    "3P":      ["L1", "L2", "L3"],
    "3P+N":    ["L1", "L2", "L3", "N"],
    "3P+N+PE": ["L1", "L2", "L3", "N", "PE"],
}

K_FLATWISE_DEFAULT = 0.33
K_EDGEWISE_DEFAULT = 0.40


def _to_float(value: Decimal | None, default: float = 0.0) -> float:
    return float(value) if value is not None else default


# ── Büküm yardımcıları ────────────────────────────────────────────────────────

def _bend_allowance(
    angle_deg: float,
    inner_radius: float,
    thickness: float,
    k_factor: float,
) -> tuple[float, float]:
    """
    BA (Bend Allowance) = θ_rad × (R + K × t)
    BD (Bend Deduction)  = 2(R+t)·tan(θ/2) − BA
    """
    a  = radians(angle_deg)
    ba = a * (inner_radius + k_factor * thickness)
    bd = 2.0 * (inner_radius + thickness) * tan(a / 2.0) - ba
    return ba, bd


def _detect_bend_type(seg1: Segment3D, seg2: Segment3D) -> str:
    """
    Büküm türü: iki segmentin dominant eksenlerinden tespit edilir.
    Z ekseni varsa 'flatwise' (düzlemden çıkan büküm), yoksa 'edgewise'.
    """
    axes = {seg1.dominant_axis(), seg2.dominant_axis()}
    return "flatwise" if "Z" in axes else "edgewise"


def _bend_axis_str(seg1: Segment3D, seg2: Segment3D) -> str:
    """
    Büküm etrafında dönen eksen:
    XY düzlemi → Z ekseni, XZ → Y, YZ → X.
    """
    axes = {seg1.dominant_axis(), seg2.dominant_axis()}
    if "Z" not in axes:
        return "Z"
    if "Y" not in axes:
        return "Y"
    return "X"


def _bend_direction_str(seg: Segment3D) -> str:
    """İkinci segment yönünden büküm yönünü döndürür (Türkçe)."""
    v  = seg.vec
    ax = seg.dominant_axis()
    if ax == "X":
        return "sag" if v.x > 0 else "sol"
    if ax == "Y":
        return "yukari" if v.y > 0 else "asagi"
    return "ileri" if v.z > 0 else "geri"


# ── 3D terminal & panel-offset yardımcıları ───────────────────────────────────

def _world_terminal_3d(
    placement: models.ProjectDevice,
    terminal: models.DeviceTerminal,
) -> Point3D:
    """
    Terminal yerel koordinatlarını panel-iç 3D koordinatlarına çevirir.
    Döndürme: Rz(rotation_deg) · Ry(rotation_y_deg) · Rx(rotation_x_deg)
    """
    local = Vec3(
        x=_to_float(terminal.x_mm),
        y=_to_float(terminal.y_mm),
        z=_to_float(terminal.z_mm),
    )
    rx = _to_float(placement.rotation_x_deg)
    ry = _to_float(placement.rotation_y_deg)
    rz = _to_float(placement.rotation_deg)
    rotated = rotate_xyz(local, rx, ry, rz)

    return Point3D(
        x=_to_float(placement.x_mm) + rotated.x,
        y=_to_float(placement.y_mm) + rotated.y,
        z=_to_float(placement.z_mm) + rotated.z,
    )


def _project_panel_offsets_3d(
    panel: models.Panel,
    project_panels: list[models.ProjectPanel],
) -> tuple[dict[int, Point3D], Point3D]:
    """
    Her ProjectPanel için panel-iç koordinat sisteminin orijinini döndürür.
    Panolar X ekseninde yan yana dizilir (cumulative_x).
    """
    if not project_panels:
        fallback = Point3D(
            x=_to_float(panel.left_margin_mm),
            y=_to_float(panel.bottom_margin_mm),
            z=0.0,
        )
        return {}, fallback

    offsets: dict[int, Point3D] = {}
    cumulative_x = 0.0
    fallback: Point3D | None = None

    for item in sorted(project_panels, key=lambda v: (v.seq, v.id)):
        defn = item.panel_definition
        offset = Point3D(
            x=cumulative_x + _to_float(defn.left_margin_mm),
            y=_to_float(defn.bottom_margin_mm),
            z=0.0,
        )
        offsets[item.id] = offset
        if fallback is None:
            fallback = offset
        cumulative_x += _to_float(defn.width_mm)

    return offsets, fallback or Point3D(0.0, 0.0, 0.0)


def _terminal_world_3d(
    placement: models.ProjectDevice,
    terminal: models.DeviceTerminal,
    panel_offsets: dict[int, Point3D],
    default_offset: Point3D,
) -> Point3D:
    local  = _world_terminal_3d(placement, terminal)
    offset = panel_offsets.get(placement.project_panel_id or -1, default_offset)
    return Point3D(
        x=offset.x + local.x,
        y=offset.y + local.y,
        z=offset.z + local.z,
    )


# ── Ana bakır ray konumu ───────────────────────────────────────────────────────

def _rail_center_3d(
    copper: models.CopperSettings,
    phase_index: int,
    base_offset: Point3D,
) -> Point3D:
    """
    Verilen faz indeksi için ana bakır rayının merkez noktası.

    Koordinat sistemi (panel-iç, sol-alt-ön köşe = orijin):
      busbar_x_mm : sol iç köşeden ray grubunun sol kenarına mesafe
      busbar_y_mm : alt iç köşeden faz-0 rayının alt kenarına mesafe
      busbar_z_mm : ön yüzeyden arka yöne mesafe

    phase_stack_axis:
      "Y"  → fazlar Y ekseninde (yukarı) istifli   (varsayılan)
      "Z"  → fazlar Z ekseninde (derinlik) istifli
    """
    bx       = _to_float(copper.busbar_x_mm, 50.0)
    by       = _to_float(copper.busbar_y_mm, 100.0)
    bz       = _to_float(copper.busbar_z_mm)
    spacing  = _to_float(copper.main_phase_spacing_mm, 60.0)
    bar_w    = _to_float(copper.main_width_mm, 40.0)
    stack_ax = (copper.phase_stack_axis or "Y").upper()

    center_x = base_offset.x + bx
    center_y = base_offset.y + by + bar_w / 2.0
    center_z = base_offset.z + bz

    if stack_ax == "Z":
        center_z += phase_index * spacing
    else:   # "Y"
        center_y += phase_index * spacing

    return Point3D(x=center_x, y=center_y, z=center_z)


def _main_busbar_seg_3d(
    copper: models.CopperSettings,
    phase_index: int,
    base_offset: Point3D,
) -> Segment3D:
    """Ana bakır için Segment3D oluşturur (X ekseni boyunca = yatay)."""
    rail   = _rail_center_3d(copper, phase_index, base_offset)
    length = _to_float(copper.busbar_length_mm, 1000.0)
    bx     = _to_float(copper.busbar_x_mm, 50.0)
    by     = _to_float(copper.busbar_y_mm, 100.0)
    is_h   = (copper.busbar_orientation or "horizontal").lower() != "vertical"

    if is_h:
        sx    = base_offset.x + bx
        start = Point3D(x=sx,        y=rail.y, z=rail.z)
        end   = Point3D(x=sx + length, y=rail.y, z=rail.z)
    else:
        sy    = base_offset.y + by
        start = Point3D(x=rail.x, y=sy,          z=rail.z)
        end   = Point3D(x=rail.x, y=sy + length, z=rail.z)

    return Segment3D(start=start, end=end)


def _junction_3d(main_seg: Segment3D, terminal: Point3D) -> Point3D:
    """
    Terminal noktasını ana bakır merkez çizgisine izdüşürür.
    Sonuç [0, bar_length] aralığında sıkıştırılır.
    """
    return project_point_onto_segment(
        terminal, main_seg.start, main_seg.direction, main_seg.length
    )


# ── Ortogonal 3D yönlendirme ──────────────────────────────────────────────────

def _route_3d(
    start: Point3D,
    end: Point3D,
    bend_radius: float,
    thickness: float,
    k_flatwise: float,
    k_edgewise: float,
) -> tuple[list[Segment3D], list[Bend]]:
    """
    Başlangıç → bitiş arası ortogonal 3D yol:
      • Tek eksen farkı  → 1 segment, 0 büküm
      • İki eksen farkı  → 2 segment, 1 büküm (90°)
      • Üç eksen farkı   → 3 segment, 2 büküm (90°, 90°)
    Öncelik sırası: X bacağı → Y bacağı → Z bacağı.
    """
    dx = abs(end.x - start.x)
    dy = abs(end.y - start.y)
    dz = abs(end.z - start.z)

    # Hareket gereken eksenleri sıraya koy
    legs: list[tuple[str, float]] = []
    if dx >= 0.01:
        legs.append(("x", end.x))
    if dy >= 0.01:
        legs.append(("y", end.y))
    if dz >= 0.01:
        legs.append(("z", end.z))

    if len(legs) <= 1:
        # Düz (aynı çizgi) veya dejenere
        return [Segment3D(start=start, end=end)], []

    # Ara noktaları (waypoints) oluştur
    cur: dict[str, float] = {"x": start.x, "y": start.y, "z": start.z}
    waypoints: list[Point3D] = [start]
    for axis, target in legs[:-1]:  # Son bacak hariç her bacaktan sonra waypoint
        cur[axis] = target
        waypoints.append(Point3D(x=cur["x"], y=cur["y"], z=cur["z"]))
    waypoints.append(end)

    segments: list[Segment3D] = []
    bends:    list[Bend]      = []
    cumulative = 0.0

    for i in range(len(waypoints) - 1):
        seg = Segment3D(start=waypoints[i], end=waypoints[i + 1])
        segments.append(seg)

        if i < len(waypoints) - 2:
            next_seg = Segment3D(start=waypoints[i + 1], end=waypoints[i + 2])
            btype = _detect_bend_type(seg, next_seg)
            baxis = _bend_axis_str(seg, next_seg)
            kf    = k_edgewise if btype == "edgewise" else k_flatwise
            ba, _ = _bend_allowance(90.0, bend_radius, thickness, kf)

            bends.append(Bend(
                distance_from_start=round(cumulative + seg.length, 2),
                angle_deg=90.0,
                direction=_bend_direction_str(next_seg),
                inner_radius=bend_radius,
                k_factor=kf,
                bend_allowance=round(ba, 4),
                bend_type=btype,
                bend_axis=baxis,
                description="Dik baglanti bukum",
            ))

        cumulative += seg.length

    return segments, bends


# ── Delik oluşturucular ───────────────────────────────────────────────────────

def _holes_for_main_busbar_3d(
    copper: models.CopperSettings,
    main_seg: Segment3D,
    junctions: list[Point3D],
    default_diameter: float,
) -> list[Hole]:
    """
    Ana bakır düz açınımında her tali bakır kavşak noktasına delik ekler.
    x_mm = rayın başından kavşağa olan 3D mesafe (açınım üzerinde).
    y_mm = bakır genişliğinin yarısı (merkezden delik).
    """
    length  = main_seg.length
    bar_w   = _to_float(copper.main_width_mm, 40.0)
    half_w  = bar_w / 2.0
    d       = _to_float(copper.default_hole_diameter_mm, 11.0) or default_diameter
    seg_dir = main_seg.direction

    seen:  set[float]  = set()
    holes: list[Hole]  = []

    for junc in junctions:
        dist = (junc - main_seg.start).dot(seg_dir)
        dist = round(max(0.0, min(dist, length)), 2)
        if dist in seen:
            continue
        seen.add(dist)
        holes.append(Hole(
            x=dist,
            y=round(half_w, 2),
            diameter=d,
            description="Tali bakir baglanti deligi",
        ))

    return sorted(holes, key=lambda h: h.x)


def _holes_for_branch_3d(
    segments: list[Segment3D],
    bar_width: float,
    terminal: models.DeviceTerminal,
    default_diameter: float,
) -> list[Hole]:
    """
    Tali bakır düz açınımında segment uçlarına delik ekler.
    İlk delik = ana bakır bağlantısı, son delik = cihaz terminali.
    """
    d         = float(terminal.hole_diameter_mm) if terminal.hole_diameter_mm else default_diameter
    half_w    = bar_width / 2.0
    term_face = terminal.terminal_face  # str | None

    holes:      list[Hole] = []
    cumulative = 0.0

    for i, seg in enumerate(segments):
        if i == 0:
            holes.append(Hole(
                x=0.0,
                y=round(half_w, 2),
                diameter=d,
                description="Ana bakir baglanti deligi",
            ))
        cumulative += seg.length
        is_last = (i == len(segments) - 1)
        holes.append(Hole(
            x=round(cumulative, 2),
            y=round(half_w, 2),
            diameter=d,
            face=term_face if is_last else None,
            description="Cihaz terminal deligi" if is_last else "Kose baglanti deligi",
        ))

    return holes


# ─────────────────────────────────────────────────────────────────────────────
def calculate_project(db: Session, project_id: int) -> CalculationResponse:
    """
    Ana hesaplama fonksiyonu (3D destekli).

    Mantık:
      1. Her aktif faz için (L1/L2/L3/N…):
         a. Ana bakır: tanımlı ray konumunda düz bar + her cihaz için kavşak deliği.
         b. Her cihaz için: tali bakır = kavşak noktasından terminal noktasına
            ortogonal 3D yol (1-3 segment, 0-2 büküm).
      2. Kesim boyu = düz boy − toplam büküm payı (cut_length).
      3. Veritabanına yaz, özet döndür.

    Geriye uyumluluk:
      z_mm = 0 olan projeler 2D davranışını korur; 3D alan şablona dönüşür.
    """
    validation = validate_project(db, project_id)
    if not validation.can_calculate:
        raise HTTPException(status_code=400, detail=validation.model_dump())

    project = db.get(models.Project, project_id)
    copper  = db.query(models.CopperSettings).filter(
        models.CopperSettings.project_id == project_id
    ).one()
    panel   = db.query(models.Panel).filter(
        models.Panel.project_id == project_id
    ).one()
    placements = (
        db.query(models.ProjectDevice)
        .options(selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals))
        .filter(models.ProjectDevice.project_id == project_id)
        .all()
    )
    project_panels = (
        db.query(models.ProjectPanel)
        .options(selectinload(models.ProjectPanel.panel_definition))
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )

    panel_offsets_3d, default_offset_3d = _project_panel_offsets_3d(panel, project_panels)

    # ── Eski sonuçları sil ────────────────────────────────────────────────────
    old_ids = db.query(models.Busbar.id).filter(
        models.Busbar.project_id == project_id
    ).subquery()
    db.query(models.BusbarBend).filter(
        models.BusbarBend.busbar_id.in_(old_ids)
    ).delete(synchronize_session=False)
    db.query(models.BusbarHole).filter(
        models.BusbarHole.busbar_id.in_(old_ids)
    ).delete(synchronize_session=False)
    db.query(models.BusbarSegment).filter(
        models.BusbarSegment.busbar_id.in_(old_ids)
    ).delete(synchronize_session=False)
    db.query(models.Busbar).filter(
        models.Busbar.project_id == project_id
    ).delete()
    db.flush()

    # ── Parametre hazırlığı ───────────────────────────────────────────────────
    phases       = PHASES_BY_SYSTEM.get(panel.phase_system or "3P", ["L1", "L2", "L3"])
    bend_radius  = _to_float(copper.bend_inner_radius_mm, 10.0)
    default_hole = _to_float(copper.default_hole_diameter_mm, 11.0)
    k_flatwise   = _to_float(copper.k_factor, K_FLATWISE_DEFAULT)
    k_edgewise   = K_EDGEWISE_DEFAULT   # Faz 4'te CopperSettings'e alan eklenecek
    main_w       = _to_float(copper.main_width_mm, 40.0)
    main_t       = _to_float(copper.main_thickness_mm, 5.0)
    branch_w     = _to_float(copper.branch_width_mm, 30.0) or main_w
    branch_t     = _to_float(copper.branch_thickness_mm, 5.0) or main_t

    busbars: list[BusbarPart] = []

    for phase_index, phase in enumerate(phases):
        # Bu faz için cihaz terminallerini topla ──────────────────────────────
        device_terminals: list[tuple[models.ProjectDevice, models.DeviceTerminal, Point3D]] = []
        for pd in placements:
            term = next((t for t in pd.device.terminals if t.phase.upper() == phase), None)
            if term is None:
                continue
            tw = _terminal_world_3d(pd, term, panel_offsets_3d, default_offset_3d)
            device_terminals.append((pd, term, tw))

        if not device_terminals:
            continue   # bu faz için cihaz yok → ana bakır da oluşturma

        # Ana bakır ───────────────────────────────────────────────────────────
        main_seg  = _main_busbar_seg_3d(copper, phase_index, default_offset_3d)
        junctions = [_junction_3d(main_seg, tw) for (_, _, tw) in device_terminals]
        main_holes = _holes_for_main_busbar_3d(copper, main_seg, junctions, default_hole)

        busbars.append(BusbarPart(
            part_no=f"MB-{phase}-{phase_index + 1:03d}",
            name=f"Ana Bara {phase}",
            busbar_type="main",
            phase=phase,
            width=main_w,
            thickness=main_t,
            material=copper.main_material or "Cu",
            quantity=1,
            connected_device_label=None,
            segments=[main_seg],
            holes=main_holes,
            bends=[],
        ))

        # Tali bakırlar (her cihaz için bir adet) ─────────────────────────────
        for branch_index, (pd, term, tw) in enumerate(device_terminals, start=1):
            junc = junctions[branch_index - 1]
            segments, bends = _route_3d(
                junc, tw, bend_radius, branch_t, k_flatwise, k_edgewise
            )
            b_holes = _holes_for_branch_3d(segments, branch_w, term, default_hole)

            busbars.append(BusbarPart(
                part_no=f"TB-{pd.label}-{phase}-{branch_index:03d}",
                name=f"Tali Bara · {pd.label} · {phase}",
                busbar_type="branch",
                phase=phase,
                width=branch_w,
                thickness=branch_t,
                material=copper.branch_material or "Cu",
                quantity=1,
                connected_device_label=pd.label,
                segments=segments,
                holes=b_holes,
                bends=bends,
            ))

    # ── Veritabanına yaz ──────────────────────────────────────────────────────
    for part in busbars:
        cut_len = round(part.cut_length, 2)

        bm = models.Busbar(
            project_id=project.id,
            part_no=part.part_no,
            name=part.name,
            busbar_type=part.busbar_type,
            phase=part.phase,
            connected_device_label=part.connected_device_label,
            width_mm=Decimal(str(part.width)),
            thickness_mm=Decimal(str(part.thickness)),
            material=part.material,
            quantity=part.quantity,
            cut_length_mm=Decimal(str(cut_len)),
        )
        db.add(bm)
        db.flush()

        for seq, seg in enumerate(part.segments, start=1):
            db.add(models.BusbarSegment(
                busbar_id=bm.id,
                seq=seq,
                start_x_mm=Decimal(str(round(seg.start.x, 2))),
                start_y_mm=Decimal(str(round(seg.start.y, 2))),
                start_z_mm=Decimal(str(round(seg.start.z, 2))),
                end_x_mm=Decimal(str(round(seg.end.x, 2))),
                end_y_mm=Decimal(str(round(seg.end.y, 2))),
                end_z_mm=Decimal(str(round(seg.end.z, 2))),
            ))

        for hole_no, hole in enumerate(part.holes, start=1):
            db.add(models.BusbarHole(
                busbar_id=bm.id,
                hole_no=hole_no,
                x_mm=Decimal(str(round(hole.x, 2))),
                y_mm=Decimal(str(round(hole.y, 2))),
                diameter_mm=Decimal(str(hole.diameter)) if hole.diameter is not None else None,
                slot_width_mm=Decimal(str(hole.slot_width))   if hole.slot_width  else None,
                slot_length_mm=Decimal(str(hole.slot_length)) if hole.slot_length else None,
                face=hole.face,
                description=hole.description,
            ))

        for bend_no, bend in enumerate(part.bends, start=1):
            db.add(models.BusbarBend(
                busbar_id=bm.id,
                bend_no=bend_no,
                distance_from_start_mm=Decimal(str(round(bend.distance_from_start, 2))),
                angle_deg=Decimal(str(bend.angle_deg)),
                direction=bend.direction,
                inner_radius_mm=Decimal(str(bend.inner_radius)),
                bend_axis=bend.bend_axis,
                bend_type=bend.bend_type,
                bend_allowance_mm=(
                    Decimal(str(round(bend.bend_allowance, 4)))
                    if bend.bend_allowance else None
                ),
                description=bend.description,
            ))

    db.commit()
    return CalculationResponse(
        status="success",
        project_id=project_id,
        summary=get_results(db, project_id).summary,
    )


# ─────────────────────────────────────────────────────────────────────────────
def get_results(db: Session, project_id: int) -> CalculationResults:
    busbars = (
        db.query(models.Busbar)
        .options(
            selectinload(models.Busbar.segments),
            selectinload(models.Busbar.holes),
            selectinload(models.Busbar.bends),
        )
        .filter(models.Busbar.project_id == project_id)
        .order_by(models.Busbar.part_no.asc())
        .all()
    )

    serialized: list[BusbarRead] = []
    total_cut   = Decimal("0")
    total_holes = 0
    total_bends = 0

    for b in busbars:
        total_cut   += b.cut_length_mm
        total_holes += len(b.holes)
        total_bends += len(b.bends)

        serialized.append(BusbarRead(
            id=b.id,
            part_no=b.part_no,
            name=b.name,
            busbar_type=b.busbar_type,
            phase=b.phase,
            connected_device_label=b.connected_device_label,
            width_mm=b.width_mm,
            thickness_mm=b.thickness_mm,
            material=b.material,
            quantity=b.quantity,
            cut_length_mm=b.cut_length_mm,
            segments=[
                {
                    "seq":         s.seq,
                    "start_x_mm":  s.start_x_mm,
                    "start_y_mm":  s.start_y_mm,
                    "start_z_mm":  s.start_z_mm,
                    "end_x_mm":    s.end_x_mm,
                    "end_y_mm":    s.end_y_mm,
                    "end_z_mm":    s.end_z_mm,
                }
                for s in sorted(b.segments, key=lambda s: s.seq)
            ],
            holes=[
                {
                    "hole_no":        h.hole_no,
                    "x_mm":           h.x_mm,
                    "y_mm":           h.y_mm,
                    "diameter_mm":    h.diameter_mm,
                    "slot_width_mm":  h.slot_width_mm,
                    "slot_length_mm": h.slot_length_mm,
                    "face":           h.face,
                    "description":    h.description,
                }
                for h in sorted(b.holes, key=lambda h: h.hole_no)
            ],
            bends=[
                {
                    "bend_no":                bd.bend_no,
                    "distance_from_start_mm": bd.distance_from_start_mm,
                    "angle_deg":              bd.angle_deg,
                    "direction":              bd.direction,
                    "inner_radius_mm":        bd.inner_radius_mm,
                    "bend_axis":              bd.bend_axis,
                    "bend_type":              bd.bend_type,
                    "bend_allowance_mm":      bd.bend_allowance_mm,
                    "description":            bd.description,
                }
                for bd in sorted(b.bends, key=lambda bd: bd.bend_no)
            ],
        ))

    summary = SummaryRead(
        main_busbar_count=sum(1 for x in serialized if x.busbar_type == "main"),
        branch_busbar_count=sum(1 for x in serialized if x.busbar_type == "branch"),
        total_cut_length_mm=total_cut,
        total_hole_count=total_holes,
        total_bend_count=total_bends,
    )
    return CalculationResults(summary=summary, busbars=serialized, warnings=[])
