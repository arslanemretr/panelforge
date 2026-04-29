from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class DeviceTerminalBase(BaseModel):
    terminal_name: str
    phase: str
    x_mm: Decimal
    y_mm: Decimal
    hole_diameter_mm: Decimal | None = None
    slot_width_mm: Decimal | None = None
    slot_length_mm: Decimal | None = None


class DeviceTerminalCreate(DeviceTerminalBase):
    pass


class DeviceTerminalRead(DeviceTerminalBase, ORMModel):
    id: int
    device_id: int


class DeviceBase(BaseModel):
    brand: str
    model: str
    device_type: str
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
    rotation_deg: Decimal = Decimal("0")
    quantity: int = 1


class ProjectDeviceCreate(ProjectDeviceBase):
    pass


class ProjectDeviceUpdate(ProjectDeviceBase):
    pass


class ProjectDeviceRead(ProjectDeviceBase, ORMModel):
    id: int
    project_id: int
    device: DeviceRead
