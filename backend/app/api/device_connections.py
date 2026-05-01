from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.device_connection import DeviceConnectionCreate, DeviceConnectionRead

router = APIRouter(tags=["device-connections"])


@router.get(
    "/projects/{project_id}/connections",
    response_model=list[DeviceConnectionRead],
)
def list_connections(
    project_id: int,
    db: Session = Depends(db_session),
) -> list[models.DeviceConnection]:
    return (
        db.query(models.DeviceConnection)
        .filter(models.DeviceConnection.project_id == project_id)
        .order_by(models.DeviceConnection.id.asc())
        .all()
    )


@router.post(
    "/projects/{project_id}/connections",
    response_model=DeviceConnectionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_connection(
    project_id: int,
    payload: DeviceConnectionCreate,
    db: Session = Depends(db_session),
) -> models.DeviceConnection:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate target device belongs to project
    target = db.get(models.ProjectDevice, payload.target_device_id)
    if target is None or target.project_id != project_id:
        raise HTTPException(status_code=404, detail="Target device not found in project")

    # Validate source device if provided
    if payload.source_device_id is not None:
        source = db.get(models.ProjectDevice, payload.source_device_id)
        if source is None or source.project_id != project_id:
            raise HTTPException(status_code=404, detail="Source device not found in project")

    conn = models.DeviceConnection(
        project_id=project_id,
        source_type=payload.source_type,
        source_device_id=payload.source_device_id,
        source_terminal_id=payload.source_terminal_id,
        target_device_id=payload.target_device_id,
        target_terminal_id=payload.target_terminal_id,
        phase=payload.phase,
        connection_type=payload.connection_type,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.delete(
    "/projects/{project_id}/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_connection(
    project_id: int,
    connection_id: int,
    db: Session = Depends(db_session),
) -> None:
    conn = (
        db.query(models.DeviceConnection)
        .filter(
            models.DeviceConnection.project_id == project_id,
            models.DeviceConnection.id == connection_id,
        )
        .one_or_none()
    )
    if conn is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
