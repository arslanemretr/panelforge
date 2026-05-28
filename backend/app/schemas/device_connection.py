from pydantic import BaseModel

from app.schemas.bend_type import BendTypeListItem
from app.schemas.branch_conductor import BranchConductorListItem
from app.schemas.common import ORMModel


class DeviceConnectionCreate(BaseModel):
    source_type: str                          # "busbar" | "device"
    source_device_id: int | None = None
    source_terminal_id: int | None = None
    target_device_id: int
    target_terminal_id: int
    phase: str
    connection_type: str                      # "main_to_device" | "device_to_device"
    bend_type_id: int | None = None
    branch_conductor_id: int | None = None


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
    bend_type_id: int | None = None
    branch_conductor_id: int | None = None
    # Nested — UI için
    bend_type: BendTypeListItem | None = None
    branch_conductor: BranchConductorListItem | None = None
