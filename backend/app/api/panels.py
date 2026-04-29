from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.panel import PanelRead, PanelUpsert

router = APIRouter(tags=["panels"])


@router.get("/projects/{project_id}/panel", response_model=PanelRead | None)
def get_panel(project_id: int, db: Session = Depends(db_session)):
    return db.query(models.Panel).filter(models.Panel.project_id == project_id).one_or_none()


@router.post("/projects/{project_id}/panel", response_model=PanelRead, status_code=status.HTTP_201_CREATED)
def create_panel(project_id: int, payload: PanelUpsert, db: Session = Depends(db_session)) -> models.Panel:
    if db.query(models.Panel).filter(models.Panel.project_id == project_id).one_or_none():
        raise HTTPException(status_code=409, detail="Panel already exists")
    panel = models.Panel(project_id=project_id, **payload.model_dump())
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.put("/projects/{project_id}/panel", response_model=PanelRead)
def upsert_panel(project_id: int, payload: PanelUpsert, db: Session = Depends(db_session)) -> models.Panel:
    panel = db.query(models.Panel).filter(models.Panel.project_id == project_id).one_or_none()
    if panel is None:
        panel = models.Panel(project_id=project_id, **payload.model_dump())
        db.add(panel)
    else:
        for field, value in payload.model_dump().items():
            setattr(panel, field, value)
    db.commit()
    db.refresh(panel)
    return panel
