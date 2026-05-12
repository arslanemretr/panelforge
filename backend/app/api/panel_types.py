from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.panel_type import PanelTypeCreate, PanelTypeRead

router = APIRouter(tags=["panel-types"])


@router.get("/panel-types", response_model=list[PanelTypeRead])
def list_panel_types(db: Session = Depends(db_session)) -> list[models.PanelType]:
    return db.query(models.PanelType).order_by(models.PanelType.name.asc()).all()


@router.post("/panel-types", response_model=PanelTypeRead, status_code=status.HTTP_201_CREATED)
def create_panel_type(payload: PanelTypeCreate, db: Session = Depends(db_session)) -> models.PanelType:
    existing = db.query(models.PanelType).filter(models.PanelType.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu isimde bir pano tipi zaten mevcut.")
    panel_type = models.PanelType(name=payload.name.strip())
    db.add(panel_type)
    db.commit()
    db.refresh(panel_type)
    return panel_type


@router.delete("/panel-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_panel_type(type_id: int, db: Session = Depends(db_session)) -> None:
    panel_type = db.get(models.PanelType, type_id)
    if not panel_type:
        raise HTTPException(status_code=404, detail="Pano tipi bulunamadı.")
    db.delete(panel_type)
    db.commit()
