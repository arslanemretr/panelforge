from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.phase_type import PhaseTypeCreate, PhaseTypeRead

router = APIRouter(tags=["phase-types"])


def _validate_phases(phases: str, db: Session) -> None:
    """phases string içindeki her etiketin phase_labels tablosunda olduğunu doğrular."""
    labels = [p.strip() for p in phases.split(",") if p.strip()]
    if not labels:
        raise HTTPException(status_code=422, detail="En az bir faz etiketi gereklidir.")
    existing = {
        row.label
        for row in db.query(models.PhaseLabel).filter(models.PhaseLabel.label.in_(labels)).all()
    }
    unknown = [l for l in labels if l not in existing]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Tanımsız faz etiketleri: {', '.join(unknown)}. Önce Faz Etiketleri tablosuna ekleyin.",
        )


@router.get("/phase-types", response_model=list[PhaseTypeRead])
def list_phase_types(db: Session = Depends(db_session)) -> list[models.PhaseType]:
    return db.query(models.PhaseType).order_by(models.PhaseType.id).all()


@router.post("/phase-types", response_model=PhaseTypeRead, status_code=status.HTTP_201_CREATED)
def create_phase_type(payload: PhaseTypeCreate, db: Session = Depends(db_session)) -> models.PhaseType:
    _validate_phases(payload.phases, db)
    pt = models.PhaseType(name=payload.name.strip(), phases=payload.phases.strip())
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt


@router.delete("/phase-types/{phase_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase_type(phase_type_id: int, db: Session = Depends(db_session)) -> None:
    pt = db.get(models.PhaseType, phase_type_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Faz tipi bulunamadı.")
    usage = (
        db.query(models.CopperDefinition)
        .filter(models.CopperDefinition.phase_type_id == phase_type_id)
        .count()
    )
    if usage > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Bu faz tipi {usage} bakır tanımında kullanılıyor, silinemez.",
        )
    db.delete(pt)
    db.commit()
