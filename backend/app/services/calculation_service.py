from __future__ import annotations

from decimal import Decimal
from math import radians, tan

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.db import models
from app.domain.busbar import Bend, BusbarPart, Hole
from app.domain.geometry import Point, Segment
from app.schemas.calculation import BusbarRead, CalculationResponse, CalculationResults, SummaryRead
from app.services.validation_service import validate_project


PHASES_BY_SYSTEM = {
    "3P":     ["L1", "L2", "L3"],
    "3P+N":   ["L1", "L2", "L3", "N"],
    "3P+N+PE":["L1", "L2", "L3", "N", "PE"],
}


def _to_float(value: Decimal | None, default: float = 0.0) -> float:
    return float(value) if value is not None else default


def _bend_allowance(
    angle_deg: float,
    inner_radius: float,
    thickness: float,
    k_factor: float,
) -> tuple[float, float]:
    """
    BA (Bend Allowance) = (π/180) × angle × (r + k × t)
    BD (Bend Deduction)  = 2 × (r + t) × tan(angle/2) − BA
    """
    a = radians(angle_deg)
    ba = a * (inner_radius + k_factor * thickness)
    bd = 2.0 * (inner_radius + thickness) * tan(a / 2.0) - ba
    return ba, bd


def _route(
    start: Point,
    end: Point,
    bend_radius: float,
    thickness: float,
    k_factor: float,
) -> tuple[list[Segment], list[Bend]]:
    """
    Produces a 1- or 2-segment path between start and end.
    Straight when aligned; L-shaped with one 90° bend otherwise.
    The elbow is placed at (end.x, start.y) — horizontal leg first.
    """
    if abs(start.x - end.x) < 0.01 or abs(start.y - end.y) < 0.01:
        return [Segment(start=start, end=end)], []

    elbow = Point(end.x, start.y)
    segments = [
        Segment(start=start, end=elbow),
        Segment(start=elbow,  end=end),
    ]
    ba, _ = _bend_allowance(90.0, bend_radius, thickness, k_factor)
    bends = [
        Bend(
            distance_from_start=segments[0].length,
            angle_deg=90.0,
            direction="yukari" if end.y > start.y else "asagi",
            inner_radius=bend_radius,
            k_factor=k_factor,
            bend_allowance=round(ba, 4),
            description="L bağlantı büküm",
        )
    ]
    return segments, bends


def _rotated_point(
    x: float, y: float,
    width: float, height: float,
    angle_deg: float,
) -> tuple[float, float]:
    n = int(angle_deg) % 360
    if n == 0:   return x, y
    if n == 90:  return height - y, x
    if n == 180: return width - x, height - y
    if n == 270: return y, width - x
    from math import cos, sin
    a = radians(angle_deg)
    return x * cos(a) - y * sin(a), x * sin(a) + y * cos(a)


def _world_terminal(placement: models.ProjectDevice, terminal: models.DeviceTerminal) -> Point:
    """
    Returns terminal position in panel-interior space.
    Origin = interior bottom-left corner (x→right, y→up).
    """
    w = _to_float(placement.device.width_mm)
    h = _to_float(placement.device.height_mm)
    tx, ty = _rotated_point(
        _to_float(terminal.x_mm),
        _to_float(terminal.y_mm),
        w, h,
        _to_float(placement.rotation_deg),
    )
    return Point(
        x=_to_float(placement.x_mm) + tx,
        y=_to_float(placement.y_mm) + ty,
    )


def _project_panel_offsets(
    panel: models.Panel,
    project_panels: list[models.ProjectPanel],
) -> tuple[dict[int, Point], Point]:
    if not project_panels:
        fallback = Point(
            x=_to_float(panel.left_margin_mm),
            y=_to_float(panel.bottom_margin_mm),
        )
        return {}, fallback

    offsets: dict[int, Point] = {}
    cumulative_x = 0.0
    fallback: Point | None = None

    for item in sorted(project_panels, key=lambda value: (value.seq, value.id)):
        definition = item.panel_definition
        offset = Point(
            x=cumulative_x + _to_float(definition.left_margin_mm),
            y=_to_float(definition.bottom_margin_mm),
        )
        offsets[item.id] = offset
        if fallback is None:
            fallback = offset
        cumulative_x += _to_float(definition.width_mm)

    return offsets, fallback or Point(0.0, 0.0)


def _terminal_world(
    placement: models.ProjectDevice,
    terminal: models.DeviceTerminal,
    panel_offsets: dict[int, Point],
    default_offset: Point,
) -> Point:
    local = _world_terminal(placement, terminal)
    offset = panel_offsets.get(placement.project_panel_id or -1, default_offset)
    return Point(
        x=offset.x + local.x,
        y=offset.y + local.y,
    )


def _rail_center(copper: models.CopperSettings, phase_index: int, base_offset: Point) -> Point:
    """
    Returns the centre-line Y (horizontal) or centre-line X (vertical)
    of the main busbar for a given phase index (0-based).

    Coordinate system: panel-interior space, origin at interior bottom-left.
      busbar_x_mm = distance from interior left to busbar group left
      busbar_y_mm = distance from interior bottom to bottom edge of phase-0 bar
      phase stacking direction:
          horizontal orientation → phases stack upward (increasing Y)
          vertical orientation   → phases stack rightward (increasing X)
    """
    bx      = _to_float(copper.busbar_x_mm, 50.0)
    by      = _to_float(copper.busbar_y_mm, 100.0)
    spacing = _to_float(copper.main_phase_spacing_mm, 60.0)
    bar_w   = _to_float(copper.main_width_mm, 40.0)
    is_h    = (copper.busbar_orientation or "horizontal").lower() != "vertical"

    if is_h:
        # Horizontal rail: constant Y for each phase, X varies
        # Phase 0 centre-Y = by + bar_w/2; phase i centre-Y = by + bar_w/2 + i*spacing
        rail_y = base_offset.y + by + bar_w / 2.0 + phase_index * spacing
        return Point(x=base_offset.x + bx, y=rail_y)
    else:
        # Vertical rail: constant X for each phase, Y varies
        rail_x = base_offset.x + bx + bar_w / 2.0 + phase_index * spacing
        return Point(x=rail_x, y=base_offset.y + by)


def _junction(copper: models.CopperSettings, phase_index: int, terminal_world: Point, base_offset: Point) -> Point:
    """
    The point on the main busbar rail where a branch busbar meets the main bar.
    For a horizontal rail: same X as device terminal, Y = rail centre Y.
    For a vertical   rail: X = rail centre X,       same Y as device terminal.
    """
    rail = _rail_center(copper, phase_index, base_offset)
    is_h = (copper.busbar_orientation or "horizontal").lower() != "vertical"
    if is_h:
        return Point(x=terminal_world.x, y=rail.y)
    else:
        return Point(x=rail.x, y=terminal_world.y)


def _main_busbar_endpoints(
    copper: models.CopperSettings,
    phase_index: int,
    base_offset: Point,
) -> tuple[Point, Point]:
    """
    Start and end points of the main busbar for a given phase.
    Length comes from copper.busbar_length_mm.
    """
    rail    = _rail_center(copper, phase_index, base_offset)
    bx      = _to_float(copper.busbar_x_mm, 50.0)
    by      = _to_float(copper.busbar_y_mm, 100.0)
    length  = _to_float(copper.busbar_length_mm, 1000.0)
    is_h    = (copper.busbar_orientation or "horizontal").lower() != "vertical"

    if is_h:
        start_x = base_offset.x + bx
        return Point(x=start_x, y=rail.y), Point(x=start_x + length, y=rail.y)
    else:
        start_y = base_offset.y + by
        return Point(x=rail.x, y=start_y), Point(x=rail.x, y=start_y + length)


def _holes_for_main_busbar(
    copper: models.CopperSettings,
    main_start: Point,
    junction_coords: list[float],
    default_diameter: float,
) -> list[Hole]:
    """
    Creates holes on the main busbar flat pattern.
    Junction coords are the along-bar distances (x_mm on flat) where
    each branch busbar attaches.

    y_mm = half the bar width (centred through the bar).
    """
    length  = _to_float(copper.busbar_length_mm, 1000.0)
    bar_w   = _to_float(copper.main_width_mm, 40.0)
    half_w  = bar_w / 2.0
    is_h    = (copper.busbar_orientation or "horizontal").lower() != "vertical"
    d       = _to_float(copper.default_hole_diameter_mm, 11.0) or default_diameter

    holes: list[Hole] = []
    seen: set[float] = set()
    for coord in sorted(junction_coords):
        dist = (coord - main_start.x) if is_h else (coord - main_start.y)
        dist = round(dist, 2)
        if dist < 0 or dist > length:
            continue
        if dist in seen:
            continue
        seen.add(dist)
        holes.append(
            Hole(
                x=dist,
                y=round(half_w, 2),
                diameter=d,
                description="Tali bakır bağlantı deliği",
            )
        )
    return holes


def _holes_for_branch(
    segments: list[Segment],
    bar_width: float,
    diameter: float | None,
    default_diameter: float,
) -> list[Hole]:
    """
    Places one hole at each segment endpoint along the unrolled flat pattern.
    y_mm = half the bar width (centred through-hole).
    """
    d      = diameter if diameter else default_diameter
    half_w = bar_width / 2.0
    holes: list[Hole] = []
    cumulative = 0.0
    descriptions = {0: "Ana bakır bağlantı deliği"}
    for i, seg in enumerate(segments):
        if i == 0:
            holes.append(Hole(x=0.0, y=round(half_w, 2), diameter=d, description="Ana bakır bağlantı deliği"))
        cumulative += seg.length
        is_last = (i == len(segments) - 1)
        desc = "Cihaz terminal deliği" if is_last else "Köşe bağlantı deliği"
        holes.append(Hole(x=round(cumulative, 2), y=round(half_w, 2), diameter=d, description=desc))
    return holes


# ─────────────────────────────────────────────────────────────────────────────
def calculate_project(db: Session, project_id: int) -> CalculationResponse:
    """
    Main calculation entry point.

    Logic:
    1. For each active phase (L1 / L2 / L3 / N …):
       a. Build the main busbar:  straight bar at the defined rail position,
          with holes at every device junction point.
       b. For each device that has a terminal for this phase:
          build a branch busbar from the junction point on the main rail
          to the device terminal.  May be straight or L-shaped (one 90° bend).
    2. Compute cut lengths (straight length minus bend deductions).
    3. Persist everything and return a summary.
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
    panel_offsets, default_offset = _project_panel_offsets(panel, project_panels)

    # ── Wipe old results ──────────────────────────────────────────────────────
    old_ids = db.query(models.Busbar.id).filter(models.Busbar.project_id == project_id).subquery()
    db.query(models.BusbarBend).filter(models.BusbarBend.busbar_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(models.BusbarHole).filter(models.BusbarHole.busbar_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(models.BusbarSegment).filter(models.BusbarSegment.busbar_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(models.Busbar).filter(models.Busbar.project_id == project_id).delete()
    db.flush()

    # ── Per-phase parameters ──────────────────────────────────────────────────
    phases        = PHASES_BY_SYSTEM.get(panel.phase_system or "3P", ["L1", "L2", "L3"])
    bend_radius   = _to_float(copper.bend_inner_radius_mm, 10.0)
    default_hole  = _to_float(copper.default_hole_diameter_mm, 11.0)
    k_factor      = _to_float(copper.k_factor, 0.33)
    main_w        = _to_float(copper.main_width_mm, 40.0)
    main_t        = _to_float(copper.main_thickness_mm, 5.0)
    branch_w      = _to_float(copper.branch_width_mm, 30.0) or main_w
    branch_t      = _to_float(copper.branch_thickness_mm, 5.0) or main_t
    is_h          = (copper.busbar_orientation or "horizontal").lower() != "vertical"

    busbars: list[BusbarPart] = []

    for phase_index, phase in enumerate(phases):
        # ── Collect all device terminals for this phase ───────────────────────
        device_terminals: list[tuple[models.ProjectDevice, models.DeviceTerminal, Point]] = []
        for pd in placements:
            term = next((t for t in pd.device.terminals if t.phase.upper() == phase), None)
            if term is None:
                continue
            tw = _terminal_world(pd, term, panel_offsets, default_offset)
            device_terminals.append((pd, term, tw))

        if not device_terminals:
            continue  # no devices for this phase → skip main busbar too

        # ── Main busbar ───────────────────────────────────────────────────────
        mb_start, mb_end = _main_busbar_endpoints(copper, phase_index, default_offset)

        # Junction coords along the rail (X for horizontal, Y for vertical)
        jcoords = [tw.x if is_h else tw.y for (_, _, tw) in device_terminals]
        main_holes = _holes_for_main_busbar(copper, mb_start, jcoords, default_hole)

        main_seg = Segment(start=mb_start, end=mb_end)

        busbars.append(
            BusbarPart(
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
            )
        )

        # ── Branch busbars (one per device) ──────────────────────────────────
        for branch_index, (pd, term, tw) in enumerate(device_terminals, start=1):
            junc = _junction(copper, phase_index, tw, default_offset)
            diam = float(term.hole_diameter_mm) if term.hole_diameter_mm else None
            segments, bends = _route(junc, tw, bend_radius, branch_t, k_factor)
            b_holes = _holes_for_branch(segments, branch_w, diam, default_hole)

            busbars.append(
                BusbarPart(
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
                )
            )

    # ── Persist ───────────────────────────────────────────────────────────────
    for part in busbars:
        total_bd = sum(
            _bend_allowance(b.angle_deg, b.inner_radius, part.thickness, b.k_factor)[1]
            for b in part.bends
        )
        cut_length = round(part.straight_length - total_bd, 2)

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
            cut_length_mm=Decimal(str(cut_length)),
        )
        db.add(bm)
        db.flush()

        for seq, seg in enumerate(part.segments, start=1):
            db.add(models.BusbarSegment(
                busbar_id=bm.id,
                seq=seq,
                start_x_mm=Decimal(str(round(seg.start.x, 2))),
                start_y_mm=Decimal(str(round(seg.start.y, 2))),
                end_x_mm=Decimal(str(round(seg.end.x, 2))),
                end_y_mm=Decimal(str(round(seg.end.y, 2))),
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
    total_cut = Decimal("0")
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
                    "seq":          s.seq,
                    "start_x_mm":   s.start_x_mm,
                    "start_y_mm":   s.start_y_mm,
                    "end_x_mm":     s.end_x_mm,
                    "end_y_mm":     s.end_y_mm,
                }
                for s in sorted(b.segments, key=lambda s: s.seq)
            ],
            holes=[
                {
                    "hole_no":      h.hole_no,
                    "x_mm":         h.x_mm,
                    "y_mm":         h.y_mm,
                    "diameter_mm":  h.diameter_mm,
                    "slot_width_mm":  h.slot_width_mm,
                    "slot_length_mm": h.slot_length_mm,
                    "description":  h.description,
                }
                for h in sorted(b.holes, key=lambda h: h.hole_no)
            ],
            bends=[
                {
                    "bend_no":                  bend.bend_no,
                    "distance_from_start_mm":   bend.distance_from_start_mm,
                    "angle_deg":                bend.angle_deg,
                    "direction":                bend.direction,
                    "inner_radius_mm":          bend.inner_radius_mm,
                    "description":              bend.description,
                }
                for bend in sorted(b.bends, key=lambda bd: bd.bend_no)
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
