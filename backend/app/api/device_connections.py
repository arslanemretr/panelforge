from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.device_connection import DeviceConnectionCreate, DeviceConnectionRead, DeviceConnectionUpdate

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


@router.put(
    "/projects/{project_id}/connections/{connection_id}",
    response_model=DeviceConnectionRead,
)
def update_connection(
    project_id: int,
    connection_id: int,
    payload: DeviceConnectionUpdate,
    db: Session = Depends(db_session),
) -> models.DeviceConnection:
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

    target = db.get(models.ProjectDevice, payload.target_device_id)
    if target is None or target.project_id != project_id:
        raise HTTPException(status_code=404, detail="Target device not found in project")

    if payload.source_device_id is not None:
        source = db.get(models.ProjectDevice, payload.source_device_id)
        if source is None or source.project_id != project_id:
            raise HTTPException(status_code=404, detail="Source device not found in project")

    for field, value in payload.model_dump().items():
        setattr(conn, field, value)

    db.commit()
    db.refresh(conn)
    return conn


@router.post(
    "/projects/{project_id}/connections/auto-assign",
    response_model=list[DeviceConnectionRead],
    status_code=status.HTTP_201_CREATED,
)
def auto_assign_connections(
    project_id: int,
    db: Session = Depends(db_session),
) -> list[models.DeviceConnection]:
    """
    Projedeki tüm cihaz terminallerini faz eşleştirmesiyle Ana Bara → Cihaz
    bağlantısı olarak otomatik atar.

    Mevcut tüm bağlantılar önce silinir, ardından her cihazın her terminali
    için bir DeviceConnection kaydı oluşturulur.
    """
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Mevcut bağlantıları temizle
    db.query(models.DeviceConnection).filter(
        models.DeviceConnection.project_id == project_id
    ).delete()
    db.flush()

    # Tüm cihaz + terminal çift
    placements = (
        db.query(models.ProjectDevice)
        .options(selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals))
        .filter(models.ProjectDevice.project_id == project_id)
        .order_by(models.ProjectDevice.id.asc())
        .all()
    )

    new_conns: list[models.DeviceConnection] = []
    for pd in placements:
        for term in pd.device.terminals:
            conn = models.DeviceConnection(
                project_id=project_id,
                source_type="busbar",
                source_device_id=None,
                source_terminal_id=None,
                target_device_id=pd.id,
                target_terminal_id=term.id,
                phase=term.phase,
                connection_type="main_to_device",
            )
            db.add(conn)
            new_conns.append(conn)

    db.commit()
    for conn in new_conns:
        db.refresh(conn)

    return new_conns


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
