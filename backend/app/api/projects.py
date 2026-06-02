from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(tags=["projects"])


def _load_project(db: Session, project_id: int) -> models.Project:
    project = (
        db.query(models.Project)
        .options(
            selectinload(models.Project.client_project).selectinload(
                models.ClientProject.firm
            )
        )
        .filter(models.Project.id == project_id)
        .one_or_none()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(db_session)) -> list[models.Project]:
    return (
        db.query(models.Project)
        .options(
            selectinload(models.Project.client_project).selectinload(
                models.ClientProject.firm
            )
        )
        .order_by(models.Project.updated_at.desc())
        .all()
    )


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(db_session)) -> models.Project:
    if payload.client_project_id is not None:
        cp = db.get(models.ClientProject, payload.client_project_id)
        if cp is None:
            raise HTTPException(status_code=404, detail="Client project not found")

    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    return _load_project(db, project.id)


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(db_session)) -> models.Project:
    return _load_project(db, project_id)


@router.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(db_session),
) -> models.Project:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.client_project_id is not None:
        cp = db.get(models.ClientProject, payload.client_project_id)
        if cp is None:
            raise HTTPException(status_code=404, detail="Client project not found")

    for field, value in payload.model_dump().items():
        setattr(project, field, value)
    db.commit()
    return _load_project(db, project_id)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(db_session)) -> None:
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
