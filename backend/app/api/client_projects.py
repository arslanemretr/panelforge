from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session, require_active_user, require_engineer
from app.db import models
from app.schemas.client_project import ClientProjectCreate, ClientProjectRead, ClientProjectUpdate

router = APIRouter(tags=["client-projects"], dependencies=[Depends(require_active_user)])


def _load(db: Session, project_id: int) -> models.ClientProject:
    cp = (
        db.query(models.ClientProject)
        .options(selectinload(models.ClientProject.firm))
        .filter(models.ClientProject.id == project_id)
        .one_or_none()
    )
    if cp is None:
        raise HTTPException(status_code=404, detail="Client project not found")
    return cp


@router.get("/client-projects", response_model=list[ClientProjectRead])
def list_client_projects(
    firm_id: int | None = Query(default=None),
    db: Session = Depends(db_session),
) -> list[models.ClientProject]:
    q = db.query(models.ClientProject).options(selectinload(models.ClientProject.firm))
    if firm_id is not None:
        q = q.filter(models.ClientProject.firm_id == firm_id)
    return q.order_by(models.ClientProject.name.asc()).all()


@router.post(
    "/client-projects",
    response_model=ClientProjectRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_engineer)],
)
def create_client_project(
    payload: ClientProjectCreate,
    db: Session = Depends(db_session),
) -> models.ClientProject:
    firm = db.get(models.Firm, payload.firm_id)
    if firm is None:
        raise HTTPException(status_code=404, detail="Firm not found")

    cp = models.ClientProject(**payload.model_dump())
    db.add(cp)
    db.commit()
    return _load(db, cp.id)


@router.put("/client-projects/{project_id}", response_model=ClientProjectRead, dependencies=[Depends(require_engineer)])
def update_client_project(
    project_id: int,
    payload: ClientProjectUpdate,
    db: Session = Depends(db_session),
) -> models.ClientProject:
    cp = _load(db, project_id)

    firm = db.get(models.Firm, payload.firm_id)
    if firm is None:
        raise HTTPException(status_code=404, detail="Firm not found")

    for field, value in payload.model_dump().items():
        setattr(cp, field, value)
    db.commit()
    return _load(db, project_id)


@router.delete("/client-projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_engineer)])
def delete_client_project(project_id: int, db: Session = Depends(db_session)) -> None:
    cp = _load(db, project_id)
    db.delete(cp)
    db.commit()
