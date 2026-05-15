from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.phase_label import PhaseLabelCreate, PhaseLabelRead, PhaseLabelUpdate

router = APIRouter(tags=["phase-labels"])


@router.get("/phase-labels", response_model=list[PhaseLabelRead])
def list_phase_labels(db: Session = Depends(db_session)) -> list[models.PhaseLabel]:
    return db.query(models.PhaseLabel).order_by(models.PhaseLabel.id).all()


@router.post("/phase-labels", response_model=PhaseLabelRead, status_code=status.HTTP_201_CREATED)
def create_phase_label(payload: PhaseLabelCreate, db: Session = Depends(db_session)) -> models.PhaseLabel:
    existing = db.query(models.PhaseLabel).filter(models.PhaseLabel.label == payload.label).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"'{payload.label}' etiketi zaten mevcut.")
    label = models.PhaseLabel(label=payload.label, color=payload.color, is_system=False)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.put("/phase-labels/{label_id}", response_model=PhaseLabelRead)
def update_phase_label(
    label_id: int,
    payload: PhaseLabelUpdate,
    db: Session = Depends(db_session),
) -> models.PhaseLabel:
    label = db.get(models.PhaseLabel, label_id)
    if not label:
        raise HTTPException(status_code=404, detail="Etiket bulunamadı.")
    label.color = payload.color
    db.commit()
    db.refresh(label)
    return label


@router.delete("/phase-labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase_label(label_id: int, db: Session = Depends(db_session)) -> None:
    label = db.get(models.PhaseLabel, label_id)
    if not label:
        raise HTTPException(status_code=404, detail="Etiket bulunamadı.")
    if label.is_system:
        raise HTTPException(status_code=409, detail="Sistem etiketleri silinemez.")
    db.delete(label)
    db.commit()
