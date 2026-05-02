from pydantic import BaseModel, Field


class DeviceImportError(BaseModel):
    sheet: str
    row: int
    message: str


class DeviceImportPreviewRow(BaseModel):
    device_code: str
    brand: str
    model: str
    device_type: str
    poles: int
    current_a: float | None = None
    width_mm: float
    height_mm: float
    depth_mm: float | None = None
    terminal_count: int


class DeviceImportPreview(BaseModel):
    can_import: bool
    device_count: int
    terminal_count: int
    errors: list[DeviceImportError] = Field(default_factory=list)
    devices: list[DeviceImportPreviewRow] = Field(default_factory=list)


class DeviceImportResult(BaseModel):
    created_device_count: int
    created_terminal_count: int
