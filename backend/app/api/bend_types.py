from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.bend_type import (
    BendTypeCreate,
    BendTypeListItem,
    BendTypeRead,
    BendTypeUpdate,
)

router = APIRouter(tags=["bend-types"])


def _load_full(bend_type_id: int, db: Session) -> models.BendType:
    obj = (
        db.query(models.BendType)
        .options(
            selectinload(models.BendType.parameters),
            selectinload(models.BendType.segments),
        )
        .filter(models.BendType.id == bend_type_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Büküm tipi bulunamadı.")
    return obj


@router.get("/bend-types", response_model=list[BendTypeListItem])
def list_bend_types(db: Session = Depends(db_session)) -> list[models.BendType]:
    items = (
        db.query(models.BendType)
        .options(selectinload(models.BendType.segments))
        .order_by(models.BendType.name.asc())
        .all()
    )
    # bend_count hesapla
    for item in items:
        item.bend_count = len(item.segments)  # type: ignore[attr-defined]
    return items


@router.get("/bend-types/{bend_type_id}", response_model=BendTypeRead)
def get_bend_type(
    bend_type_id: int,
    db: Session = Depends(db_session),
) -> models.BendType:
    return _load_full(bend_type_id, db)


@router.post("/bend-types", response_model=BendTypeRead, status_code=status.HTTP_201_CREATED)
def create_bend_type(
    payload: BendTypeCreate,
    db: Session = Depends(db_session),
) -> models.BendType:
    obj = models.BendType(
        name=payload.name,
        description=payload.description,
        template_type=payload.template_type,
        thickness_mm=payload.thickness_mm,
        parallel_count=payload.parallel_count,
        start_direction=payload.start_direction,
    )
    db.add(obj)
    db.flush()  # id almak için

    for p in payload.parameters:
        db.add(models.BendParameter(bend_type_id=obj.id, **p.model_dump()))
    for s in payload.segments:
        db.add(models.BendSegment(bend_type_id=obj.id, **s.model_dump()))

    db.commit()
    return _load_full(obj.id, db)


@router.put("/bend-types/{bend_type_id}", response_model=BendTypeRead)
def update_bend_type(
    bend_type_id: int,
    payload: BendTypeUpdate,
    db: Session = Depends(db_session),
) -> models.BendType:
    obj = _load_full(bend_type_id, db)

    # Üst alanları güncelle
    obj.name = payload.name
    obj.description = payload.description
    obj.template_type = payload.template_type
    obj.thickness_mm = payload.thickness_mm
    obj.parallel_count = payload.parallel_count
    obj.start_direction = payload.start_direction

    # Parameters ve Segments sil + yeniden ekle (basit replace stratejisi)
    for p in list(obj.parameters):
        db.delete(p)
    for s in list(obj.segments):
        db.delete(s)
    db.flush()

    for p in payload.parameters:
        db.add(models.BendParameter(bend_type_id=obj.id, **p.model_dump()))
    for s in payload.segments:
        db.add(models.BendSegment(bend_type_id=obj.id, **s.model_dump()))

    db.commit()
    return _load_full(obj.id, db)


@router.delete("/bend-types/{bend_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bend_type(
    bend_type_id: int,
    db: Session = Depends(db_session),
) -> None:
    obj = db.get(models.BendType, bend_type_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Büküm tipi bulunamadı.")
    db.delete(obj)
    db.commit()
