from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.project_copper import ProjectCopperCreate, ProjectCopperRead, ProjectCopperUpdate

router = APIRouter(tags=["project-coppers"])


def _load_copper(db: Session, project_id: int, project_copper_id: int) -> models.ProjectCopper:
    item = (
        db.query(models.ProjectCopper)
        .options(
            selectinload(models.ProjectCopper.copper_definition),
            selectinload(models.ProjectCopper.phase_type),
        )
        .filter(
            models.ProjectCopper.project_id == project_id,
            models.ProjectCopper.id == project_copper_id,
        )
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project copper not found")
    return item


@router.get("/projects/{project_id}/copper-layout", response_model=list[ProjectCopperRead])
def list_project_coppers(project_id: int, db: Session = Depends(db_session)) -> list[models.ProjectCopper]:
    return (
        db.query(models.ProjectCopper)
        .options(
            selectinload(models.ProjectCopper.copper_definition),
            selectinload(models.ProjectCopper.phase_type),
        )
        .filter(models.ProjectCopper.project_id == project_id)
        .order_by(models.ProjectCopper.seq.asc(), models.ProjectCopper.id.asc())
        .all()
    )


@router.post(
    "/projects/{project_id}/copper-layout",
    response_model=ProjectCopperRead,
    status_code=status.HTTP_201_CREATED,
)
def create_project_copper(
    project_id: int,
    payload: ProjectCopperCreate,
    db: Session = Depends(db_session),
) -> models.ProjectCopper:
    definition = db.get(models.CopperDefinition, payload.copper_definition_id)
    if definition is None:
        raise HTTPException(status_code=404, detail="Copper definition not found")

    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    next_seq = (
        db.query(models.ProjectCopper.seq)
        .filter(models.ProjectCopper.project_id == project_id)
        .order_by(models.ProjectCopper.seq.desc())
        .limit(1)
        .scalar()
        or 0
    )
    item = models.ProjectCopper(
        project_id=project_id,
        copper_definition_id=payload.copper_definition_id,
        length_mm=payload.length_mm,
        quantity=payload.quantity,
        seq=next_seq + 1,
        # Kütüphaneden kopyala
        main_width_mm=definition.main_width_mm,
        main_thickness_mm=definition.main_thickness_mm,
        busbar_x_mm=definition.busbar_x_mm,
        busbar_y_mm=definition.busbar_y_mm,
        busbar_z_mm=definition.busbar_z_mm,
        busbar_orientation=definition.busbar_orientation,
        phase_type_id=definition.phase_type_id,
        bars_per_phase=definition.bars_per_phase,
        bar_gap_mm=definition.bar_gap_mm,
        phase_center_mm=definition.phase_center_mm,
        layer_type=definition.layer_type,
        neutral_bar_count=definition.neutral_bar_count,
    )
    db.add(item)
    db.commit()
    return _load_copper(db, project_id, item.id)


@router.put(
    "/projects/{project_id}/copper-layout/{project_copper_id}",
    response_model=ProjectCopperRead,
)
def update_project_copper(
    project_id: int,
    project_copper_id: int,
    payload: ProjectCopperUpdate,
    db: Session = Depends(db_session),
) -> models.ProjectCopper:
    item = (
        db.query(models.ProjectCopper)
        .filter(
            models.ProjectCopper.project_id == project_id,
            models.ProjectCopper.id == project_copper_id,
        )
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project copper not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    return _load_copper(db, project_id, item.id)


@router.post(
    "/projects/{project_id}/copper-layout/{project_copper_id}/reset",
    response_model=ProjectCopperRead,
)
def reset_project_copper(
    project_id: int,
    project_copper_id: int,
    db: Session = Depends(db_session),
) -> models.ProjectCopper:
    item = (
        db.query(models.ProjectCopper)
        .filter(
            models.ProjectCopper.project_id == project_id,
            models.ProjectCopper.id == project_copper_id,
        )
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project copper not found")

    definition = db.get(models.CopperDefinition, item.copper_definition_id)
    if definition is None:
        raise HTTPException(status_code=404, detail="Copper definition not found")

    item.main_width_mm = definition.main_width_mm
    item.main_thickness_mm = definition.main_thickness_mm
    item.busbar_x_mm = definition.busbar_x_mm
    item.busbar_y_mm = definition.busbar_y_mm
    item.busbar_z_mm = definition.busbar_z_mm
    item.busbar_orientation = definition.busbar_orientation
    item.phase_type_id = definition.phase_type_id
    item.bars_per_phase = definition.bars_per_phase
    item.bar_gap_mm = definition.bar_gap_mm
    item.phase_center_mm = definition.phase_center_mm
    item.layer_type = definition.layer_type
    item.neutral_bar_count = definition.neutral_bar_count

    db.commit()
    return _load_copper(db, project_id, item.id)


@router.delete(
    "/projects/{project_id}/copper-layout/{project_copper_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project_copper(
    project_id: int,
    project_copper_id: int,
    db: Session = Depends(db_session),
) -> None:
    item = (
        db.query(models.ProjectCopper)
        .filter(
            models.ProjectCopper.project_id == project_id,
            models.ProjectCopper.id == project_copper_id,
        )
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project copper not found")
    db.delete(item)
    db.commit()

    remaining = (
        db.query(models.ProjectCopper)
        .filter(models.ProjectCopper.project_id == project_id)
        .order_by(models.ProjectCopper.seq.asc(), models.ProjectCopper.id.asc())
        .all()
    )
    for index, copper_item in enumerate(remaining, start=1):
        copper_item.seq = index
    db.commit()
