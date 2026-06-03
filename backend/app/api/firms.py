from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session, require_active_user, require_engineer
from app.db import models
from app.schemas.firm import FirmCreate, FirmRead, FirmUpdate

router = APIRouter(tags=["firms"], dependencies=[Depends(require_active_user)])


def _load_firm(db: Session, firm_id: int) -> models.Firm:
    firm = db.get(models.Firm, firm_id)
    if firm is None:
        raise HTTPException(status_code=404, detail="Firm not found")
    return firm


@router.get("/firms", response_model=list[FirmRead])
def list_firms(db: Session = Depends(db_session)) -> list[models.Firm]:
    return (
        db.query(models.Firm)
        .order_by(models.Firm.name.asc())
        .all()
    )


@router.post("/firms", response_model=FirmRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_engineer)])
def create_firm(payload: FirmCreate, db: Session = Depends(db_session)) -> models.Firm:
    firm = models.Firm(**payload.model_dump())
    db.add(firm)
    db.commit()
    db.refresh(firm)
    return firm


@router.put("/firms/{firm_id}", response_model=FirmRead, dependencies=[Depends(require_engineer)])
def update_firm(
    firm_id: int,
    payload: FirmUpdate,
    db: Session = Depends(db_session),
) -> models.Firm:
    firm = _load_firm(db, firm_id)
    for field, value in payload.model_dump().items():
        setattr(firm, field, value)
    db.commit()
    db.refresh(firm)
    return firm


@router.delete("/firms/{firm_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_engineer)])
def delete_firm(firm_id: int, db: Session = Depends(db_session)) -> None:
    firm = _load_firm(db, firm_id)
    db.delete(firm)
    db.commit()
