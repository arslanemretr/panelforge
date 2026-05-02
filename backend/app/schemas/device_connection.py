from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.schemas.device import DeviceRead


class DeviceConnectionCreate(BaseModel):
    source_type: str                          # "busbar" | "device"
    source_device_id: int | None = None
    source_terminal_id: int | None = None
    target_device_id: int
    target_terminal_id: int
    phase: str
    connection_type: str                      # "main_to_device" | "device_to_device"


class DeviceConnectionUpdate(DeviceConnectionCreate):
    pass


class DeviceConnectionRead(ORMModel):
    id: int
    project_id: int
    source_type: str
    source_device_id: int | None = None
    source_terminal_id: int | None = None
    target_device_id: int
    target_terminal_id: int
    phase: str
    connection_type: str
