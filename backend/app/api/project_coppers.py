from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.project_copper import ProjectCopperCreate, ProjectCopperRead

router = APIRouter(tags=["project-coppers"])


@router.get("/projects/{project_id}/copper-layout", response_model=list[ProjectCopperRead])
def list_project_coppers(project_id: int, db: Session = Depends(db_session)) -> list[models.ProjectCopper]:
    return (
        db.query(models.ProjectCopper)
        .options(selectinload(models.ProjectCopper.copper_definition))
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
    )
    db.add(item)
    db.commit()
    return (
        db.query(models.ProjectCopper)
        .options(selectinload(models.ProjectCopper.copper_definition))
        .filter(models.ProjectCopper.id == item.id)
        .one()
    )


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
