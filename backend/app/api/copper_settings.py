from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.copper import CopperSettingsRead, CopperSettingsUpsert

router = APIRouter(tags=["copper-settings"])


@router.get("/projects/{project_id}/copper-settings", response_model=CopperSettingsRead | None)
def get_copper_settings(project_id: int, db: Session = Depends(db_session)):
    return db.query(models.CopperSettings).filter(models.CopperSettings.project_id == project_id).one_or_none()


@router.post("/projects/{project_id}/copper-settings", response_model=CopperSettingsRead, status_code=status.HTTP_201_CREATED)
def create_copper_settings(project_id: int, payload: CopperSettingsUpsert, db: Session = Depends(db_session)):
    settings = models.CopperSettings(project_id=project_id, **payload.model_dump())
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.put("/projects/{project_id}/copper-settings", response_model=CopperSettingsRead)
def upsert_copper_settings(project_id: int, payload: CopperSettingsUpsert, db: Session = Depends(db_session)):
    settings = db.query(models.CopperSettings).filter(models.CopperSettings.project_id == project_id).one_or_none()
    if settings is None:
        settings = models.CopperSettings(project_id=project_id, **payload.model_dump())
        db.add(settings)
    else:
        for field, value in payload.model_dump().items():
            setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
