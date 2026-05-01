from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class DeviceTerminalBase(BaseModel):
    terminal_name: str
    phase: str
    x_mm: Decimal
    y_mm: Decimal
    z_mm: Decimal = Decimal("0")
    terminal_face: str | None = None   # front|back|left|right|top|bottom — boş ise front varsayılır
    hole_diameter_mm: Decimal | None = None
    slot_width_mm: Decimal | None = None
    slot_length_mm: Decimal | None = None
    terminal_role: str | None = None   # input | output
    terminal_group: str | None = None  # line | load | bus | branch
    # Genişletilmiş terminal bilgileri
    terminal_type: str | None = None           # "Ön Terminal" | "Arka Terminal" vb.
    terminal_width_mm: Decimal | None = None   # terminal bloğu fiziksel genişliği
    terminal_height_mm: Decimal | None = None  # terminal bloğu fiziksel yüksekliği
    terminal_depth_mm: Decimal | None = None   # terminal bloğu fiziksel derinliği
    bolt_type: str | None = None               # "M12", "M10" vb.
    bolt_count: int | None = None              # vida miktarı
    bolt_center_distance_mm: Decimal | None = None  # merkez ölçüsü (mm)


class DeviceTerminalCreate(DeviceTerminalBase):
    pass


class DeviceTerminalRead(DeviceTerminalBase, ORMModel):
    id: int
    device_id: int


class DeviceBase(BaseModel):
    brand: str
    model: str
    device_type: str
    enclosure_type: str | None = None  # "Sabit" | "Çekme" | "Eklenti"
    poles: int
    current_a: Decimal | None = None
    width_mm: Decimal
    height_mm: Decimal
    depth_mm: Decimal | None = None


class DeviceCreate(DeviceBase):
    terminals: list[DeviceTerminalCreate] = Field(default_factory=list)


class DeviceUpdate(DeviceCreate):
    pass


class DeviceRead(DeviceBase, ORMModel):
    id: int
    terminals: list[DeviceTerminalRead] = Field(default_factory=list)


class ProjectDeviceBase(BaseModel):
    project_panel_id: int | None = None
    device_id: int
    label: str
    x_mm: Decimal
    y_mm: Decimal
    z_mm: Decimal = Decimal("0")
    rotation_deg: Decimal = Decimal("0")      # = rotation_z_deg
    rotation_x_deg: Decimal = Decimal("0")
    rotation_y_deg: Decimal = Decimal("0")
    quantity: int = 1


class ProjectDeviceCreate(ProjectDeviceBase):
    pass


class ProjectDeviceUpdate(ProjectDeviceBase):
    pass


class ProjectDeviceRead(ProjectDeviceBase, ORMModel):
    id: int
    project_id: int
    device: DeviceRead
