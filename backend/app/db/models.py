from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_name: Mapped[str | None] = mapped_column(Text)
    panel_code: Mapped[str | None] = mapped_column(Text)
    prepared_by: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    panel: Mapped["Panel | None"] = relationship(back_populates="project", cascade="all, delete-orphan", uselist=False)
    panel_layout_items: Mapped[list["ProjectPanel"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    placed_devices: Mapped[list["ProjectDevice"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    copper_settings: Mapped["CopperSettings | None"] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        uselist=False,
    )
    copper_layout_items: Mapped[list["ProjectCopper"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    busbars: Mapped[list["Busbar"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    device_connections: Mapped[list["DeviceConnection"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class PanelDefinition(Base):
    __tablename__ = "panel_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    width_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    height_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    depth_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    mounting_plate_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    mounting_plate_height_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    left_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    right_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    top_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    bottom_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    busbar_orientation: Mapped[str | None] = mapped_column(Text)
    phase_system: Mapped[str | None] = mapped_column(Text)
    busbar_rail_offset_mm: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("100"))
    busbar_end_setback_mm: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("60"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    project_layout_items: Mapped[list["ProjectPanel"]] = relationship(back_populates="panel_definition")


class ProjectPanel(Base):
    __tablename__ = "project_panels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    panel_definition_id: Mapped[int] = mapped_column(ForeignKey("panel_definitions.id"))
    label: Mapped[str | None] = mapped_column(Text)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    project: Mapped["Project"] = relationship(back_populates="panel_layout_items")
    panel_definition: Mapped["PanelDefinition"] = relationship(back_populates="project_layout_items")


class ProjectCopper(Base):
    __tablename__ = "project_coppers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    copper_definition_id: Mapped[int] = mapped_column(ForeignKey("copper_definitions.id"))
    length_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    project: Mapped["Project"] = relationship(back_populates="copper_layout_items")
    copper_definition: Mapped["CopperDefinition"] = relationship(back_populates="project_layout_items")


class Panel(Base):
    __tablename__ = "panels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), unique=True)
    width_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    height_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    depth_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    mounting_plate_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    mounting_plate_height_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    left_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    right_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    top_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    bottom_margin_mm: Mapped[Decimal] = mapped_column(Numeric, default=0)
    busbar_orientation: Mapped[str | None] = mapped_column(Text)
    phase_system: Mapped[str | None] = mapped_column(Text)
    busbar_rail_offset_mm: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("100"))
    busbar_end_setback_mm: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("60"))

    project: Mapped["Project"] = relationship(back_populates="panel")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    device_type: Mapped[str] = mapped_column(Text, nullable=False)
    poles: Mapped[int] = mapped_column(Integer, nullable=False)
    current_a: Mapped[Decimal | None] = mapped_column(Numeric)
    width_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    height_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    depth_mm: Mapped[Decimal | None] = mapped_column(Numeric)

    terminals: Mapped[list["DeviceTerminal"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    placements: Mapped[list["ProjectDevice"]] = relationship(back_populates="device")


class DeviceTerminal(Base):
    __tablename__ = "device_terminals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"))
    terminal_name: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[str] = mapped_column(Text, nullable=False)
    x_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    y_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    z_mm: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))
    terminal_face: Mapped[str | None] = mapped_column(Text)          # front|back|left|right|top|bottom
    hole_diameter_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_length_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    terminal_role: Mapped[str | None] = mapped_column(Text)          # input | output
    terminal_group: Mapped[str | None] = mapped_column(Text)         # line | load | bus | branch

    device: Mapped["Device"] = relationship(back_populates="terminals")


class ProjectDevice(Base):
    __tablename__ = "project_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    project_panel_id: Mapped[int | None] = mapped_column(ForeignKey("project_panels.id", ondelete="SET NULL"), nullable=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    label: Mapped[str] = mapped_column(Text, nullable=False)
    x_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    y_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    z_mm: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))
    rotation_deg: Mapped[Decimal] = mapped_column(Numeric, default=0)   # = rotation_z_deg
    rotation_x_deg: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))
    rotation_y_deg: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    project: Mapped["Project"] = relationship(back_populates="placed_devices")
    device: Mapped["Device"] = relationship(back_populates="placements")


class DeviceConnection(Base):
    """
    Explicit kaynak → hedef bağlantı modeli.

    source_type = "busbar"  → kaynak ana bara (source_device_id / source_terminal_id = NULL)
    source_type = "device"  → kaynak cihaz terminali
    """
    __tablename__ = "device_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Kaynak
    source_type: Mapped[str] = mapped_column(Text, nullable=False)           # "busbar" | "device"
    source_device_id: Mapped[int | None] = mapped_column(ForeignKey("project_devices.id", ondelete="CASCADE"))
    source_terminal_id: Mapped[int | None] = mapped_column(ForeignKey("device_terminals.id", ondelete="CASCADE"))

    # Hedef
    target_device_id: Mapped[int] = mapped_column(ForeignKey("project_devices.id", ondelete="CASCADE"), nullable=False)
    target_terminal_id: Mapped[int] = mapped_column(ForeignKey("device_terminals.id", ondelete="CASCADE"), nullable=False)

    phase: Mapped[str] = mapped_column(Text, nullable=False)                 # L1 | L2 | L3 | N | PE
    connection_type: Mapped[str] = mapped_column(Text, nullable=False)       # "main_to_device" | "device_to_device"

    project: Mapped["Project"] = relationship(back_populates="device_connections")
    source_device: Mapped["ProjectDevice | None"] = relationship(foreign_keys=[source_device_id])
    target_device: Mapped["ProjectDevice"] = relationship(foreign_keys=[target_device_id])
    source_terminal: Mapped["DeviceTerminal | None"] = relationship(foreign_keys=[source_terminal_id])
    target_terminal: Mapped["DeviceTerminal"] = relationship(foreign_keys=[target_terminal_id])


class CopperSettings(Base):
    __tablename__ = "copper_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), unique=True)
    main_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    main_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    main_material: Mapped[str] = mapped_column(Text, default="Cu")
    main_phase_spacing_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_material: Mapped[str] = mapped_column(Text, default="Cu")
    branch_phase_spacing_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    bend_inner_radius_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    k_factor: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("0.33"))
    min_hole_edge_distance_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    min_bend_hole_distance_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    default_hole_diameter_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    use_slot_holes: Mapped[bool] = mapped_column(Boolean, default=False)
    slot_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_length_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    # Ana bakır yerleşim bilgileri
    busbar_x_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    busbar_y_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    busbar_z_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    busbar_orientation: Mapped[str | None] = mapped_column(Text, default="horizontal")
    busbar_length_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    busbar_phase_count: Mapped[int | None] = mapped_column(Integer, default=3)
    bars_per_phase: Mapped[int | None] = mapped_column(Integer, default=1)
    bar_gap_mm: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("0"))
    busbar_plane: Mapped[str | None] = mapped_column(Text, default="XY")   # XY | XZ
    phase_stack_axis: Mapped[str | None] = mapped_column(Text, default="Y") # Y | Z
    main_density_g_cm3: Mapped[Decimal | None] = mapped_column(Numeric)   # g/cm³, None → malzeme varsayılanı
    branch_density_g_cm3: Mapped[Decimal | None] = mapped_column(Numeric) # g/cm³, None → malzeme varsayılanı
    k_factor_edgewise: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("0.40"))  # edgewise K faktörü
    busbar_clearance_mm: Mapped[Decimal | None] = mapped_column(Numeric)   # ana bara-bara arası min. mesafe
    branch_clearance_mm: Mapped[Decimal | None] = mapped_column(Numeric)   # tali bara-bara arası min. mesafe
    min_hole_hole_distance_mm: Mapped[Decimal | None] = mapped_column(Numeric)  # delik merkezi arası min. mesafe

    project: Mapped["Project"] = relationship(back_populates="copper_settings")


class CopperDefinition(Base):
    __tablename__ = "copper_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    main_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    main_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    main_material: Mapped[str] = mapped_column(Text, default="Cu")
    main_phase_spacing_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    branch_material: Mapped[str] = mapped_column(Text, default="Cu")
    branch_phase_spacing_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    bend_inner_radius_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    k_factor: Mapped[Decimal | None] = mapped_column(Numeric, default=Decimal("0.33"))
    min_hole_edge_distance_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    min_bend_hole_distance_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    default_hole_diameter_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    use_slot_holes: Mapped[bool] = mapped_column(Boolean, default=False)
    slot_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_length_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    density_g_cm3: Mapped[Decimal | None] = mapped_column(Numeric)  # g/cm³ — Cu≈8.96, Al≈2.70
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    project_layout_items: Mapped[list["ProjectCopper"]] = relationship(back_populates="copper_definition")


class Busbar(Base):
    __tablename__ = "busbars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    part_no: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    busbar_type: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[str] = mapped_column(Text, nullable=False)
    connected_device_label: Mapped[str | None] = mapped_column(Text)
    width_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    thickness_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    material: Mapped[str] = mapped_column(Text, default="Cu")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    cut_length_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="busbars")
    segments: Mapped[list["BusbarSegment"]] = relationship(back_populates="busbar", cascade="all, delete-orphan")
    holes: Mapped[list["BusbarHole"]] = relationship(back_populates="busbar", cascade="all, delete-orphan")
    bends: Mapped[list["BusbarBend"]] = relationship(back_populates="busbar", cascade="all, delete-orphan")


class BusbarSegment(Base):
    __tablename__ = "busbar_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    busbar_id: Mapped[int] = mapped_column(ForeignKey("busbars.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    start_x_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    start_y_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    start_z_mm: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))
    end_x_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    end_y_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    end_z_mm: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0"))

    busbar: Mapped["Busbar"] = relationship(back_populates="segments")


class BusbarHole(Base):
    __tablename__ = "busbar_holes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    busbar_id: Mapped[int] = mapped_column(ForeignKey("busbars.id", ondelete="CASCADE"))
    hole_no: Mapped[int] = mapped_column(Integer, nullable=False)
    x_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    y_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    diameter_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_width_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    slot_length_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    face: Mapped[str | None] = mapped_column(Text)                   # front|back|left|right|top|bottom
    description: Mapped[str | None] = mapped_column(Text)

    busbar: Mapped["Busbar"] = relationship(back_populates="holes")


class BusbarBend(Base):
    __tablename__ = "busbar_bends"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    busbar_id: Mapped[int] = mapped_column(ForeignKey("busbars.id", ondelete="CASCADE"))
    bend_no: Mapped[int] = mapped_column(Integer, nullable=False)
    distance_from_start_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    angle_deg: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    inner_radius_mm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    bend_axis: Mapped[str | None] = mapped_column(Text)              # X | Y | Z
    bend_type: Mapped[str | None] = mapped_column(Text)              # flatwise | edgewise
    bend_allowance_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    description: Mapped[str | None] = mapped_column(Text)

    busbar: Mapped["Busbar"] = relationship(back_populates="bends")
