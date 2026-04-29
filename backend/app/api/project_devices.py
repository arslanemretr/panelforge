from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.device import ProjectDeviceCreate, ProjectDeviceRead, ProjectDeviceUpdate

router = APIRouter(tags=["project-devices"])


@router.get("/projects/{project_id}/devices", response_model=list[ProjectDeviceRead])
def list_project_devices(project_id: int, db: Session = Depends(db_session)) -> list[models.ProjectDevice]:
    return (
        db.query(models.ProjectDevice)
        .options(selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals))
        .filter(models.ProjectDevice.project_id == project_id)
        .order_by(models.ProjectDevice.id.asc())
        .all()
    )


@router.post("/projects/{project_id}/devices", response_model=ProjectDeviceRead, status_code=status.HTTP_201_CREATED)
def create_project_device(project_id: int, payload: ProjectDeviceCreate, db: Session = Depends(db_session)) -> models.ProjectDevice:
    placement = models.ProjectDevice(project_id=project_id, **payload.model_dump())
    db.add(placement)
    db.commit()
    return (
        db.query(models.ProjectDevice)
        .options(selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals))
        .filter(models.ProjectDevice.id == placement.id)
        .one()
    )


@router.put("/projects/{project_id}/devices/{project_device_id}", response_model=ProjectDeviceRead)
def update_project_device(
    project_id: int,
    project_device_id: int,
    payload: ProjectDeviceUpdate,
    db: Session = Depends(db_session),
) -> models.ProjectDevice:
    placement = (
        db.query(models.ProjectDevice)
        .filter(models.ProjectDevice.project_id == project_id, models.ProjectDevice.id == project_device_id)
        .one_or_none()
    )
    if not placement:
        raise HTTPException(status_code=404, detail="Placed device not found")
    for field, value in payload.model_dump().items():
        setattr(placement, field, value)
    db.commit()
    return (
        db.query(models.ProjectDevice)
        .options(selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals))
        .filter(models.ProjectDevice.id == project_device_id)
        .one()
    )


@router.delete("/projects/{project_id}/devices/{project_device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_device(project_id: int, project_device_id: int, db: Session = Depends(db_session)) -> None:
    placement = (
        db.query(models.ProjectDevice)
        .filter(models.ProjectDevice.project_id == project_id, models.ProjectDevice.id == project_device_id)
        .one_or_none()
    )
    if not placement:
        raise HTTPException(status_code=404, detail="Placed device not found")
    db.delete(placement)
    db.commit()
