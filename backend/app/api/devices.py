from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.device import DeviceCreate, DeviceRead, DeviceUpdate
from app.schemas.device_import import DeviceImportPreview, DeviceImportResult
from app.services.device_excel_service import (
    build_export_excel,
    build_template_excel,
    import_devices_from_excel,
    preview_import,
)

router = APIRouter(tags=["devices"])


@router.get("/devices", response_model=list[DeviceRead])
def list_devices(db: Session = Depends(db_session)) -> list[models.Device]:
    return db.query(models.Device).options(selectinload(models.Device.terminals)).order_by(models.Device.id.desc()).all()


@router.get("/devices/export/excel")
def export_devices_excel(db: Session = Depends(db_session)) -> Response:
    content = build_export_excel(db)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="panelforge-devices.xlsx"'},
    )


@router.get("/devices/import/template")
def download_devices_template() -> Response:
    content = build_template_excel()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="panelforge-device-import-template.xlsx"'},
    )


@router.post("/devices/import/preview", response_model=DeviceImportPreview)
async def preview_devices_import(file: UploadFile = File(...)) -> DeviceImportPreview:
    return preview_import(await file.read())


@router.post("/devices/import/excel", response_model=DeviceImportResult, status_code=status.HTTP_201_CREATED)
async def import_devices_excel(file: UploadFile = File(...), db: Session = Depends(db_session)) -> DeviceImportResult:
    try:
        return import_devices_from_excel(db, await file.read())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/devices", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreate, db: Session = Depends(db_session)) -> models.Device:
    data = payload.model_dump(exclude={"terminals"})
    device = models.Device(**data)
    db.add(device)
    db.flush()
    for terminal in payload.terminals:
        db.add(models.DeviceTerminal(device_id=device.id, **terminal.model_dump()))
    db.commit()
    db.refresh(device)
    return (
        db.query(models.Device)
        .options(selectinload(models.Device.terminals))
        .filter(models.Device.id == device.id)
        .one()
    )


@router.get("/devices/{device_id}", response_model=DeviceRead)
def get_device(device_id: int, db: Session = Depends(db_session)) -> models.Device:
    device = (
        db.query(models.Device)
        .options(selectinload(models.Device.terminals))
        .filter(models.Device.id == device_id)
        .one_or_none()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/devices/{device_id}", response_model=DeviceRead)
def update_device(device_id: int, payload: DeviceUpdate, db: Session = Depends(db_session)) -> models.Device:
    device = db.get(models.Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for field, value in payload.model_dump(exclude={"terminals"}).items():
        setattr(device, field, value)

    db.query(models.DeviceTerminal).filter(models.DeviceTerminal.device_id == device_id).delete()
    db.flush()
    for terminal in payload.terminals:
        db.add(models.DeviceTerminal(device_id=device_id, **terminal.model_dump()))

    db.commit()
    return (
        db.query(models.Device)
        .options(selectinload(models.Device.terminals))
        .filter(models.Device.id == device_id)
        .one()
    )


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: int, db: Session = Depends(db_session)) -> None:
    device = db.get(models.Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    usage_count = (
        db.query(models.ProjectDevice)
        .filter(models.ProjectDevice.device_id == device_id)
        .count()
    )
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bu cihaz {usage_count} projede kullanılıyor, silinemez.",
        )
    db.delete(device)
    db.commit()
