from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.copper_definition import (
    CopperDefinitionCreate,
    CopperDefinitionRead,
    CopperDefinitionUpdate,
)

router = APIRouter(tags=["copper-definitions"])


def _load_opts():
    return [selectinload(models.CopperDefinition.phase_type)]


@router.get("/copper-definitions", response_model=list[CopperDefinitionRead])
def list_copper_definitions(
    kind: str | None = Query(default=None),
    db: Session = Depends(db_session),
) -> list[models.CopperDefinition]:
    query = db.query(models.CopperDefinition).options(*_load_opts())
    if kind:
        query = query.filter(models.CopperDefinition.copper_kind == kind)
    return query.order_by(models.CopperDefinition.updated_at.desc()).all()


@router.post("/copper-definitions", response_model=CopperDefinitionRead, status_code=status.HTTP_201_CREATED)
def create_copper_definition(payload: CopperDefinitionCreate, db: Session = Depends(db_session)) -> models.CopperDefinition:
    definition = models.CopperDefinition(**payload.model_dump())
    db.add(definition)
    db.commit()
    db.refresh(definition)
    db.query(models.CopperDefinition).options(*_load_opts()).filter(
        models.CopperDefinition.id == definition.id
    ).first()
    return definition


@router.get("/copper-definitions/{definition_id}", response_model=CopperDefinitionRead)
def get_copper_definition(definition_id: int, db: Session = Depends(db_session)) -> models.CopperDefinition:
    definition = (
        db.query(models.CopperDefinition)
        .options(*_load_opts())
        .filter(models.CopperDefinition.id == definition_id)
        .first()
    )
    if not definition:
        raise HTTPException(status_code=404, detail="Copper definition not found")
    return definition


@router.put("/copper-definitions/{definition_id}", response_model=CopperDefinitionRead)
def update_copper_definition(
    definition_id: int,
    payload: CopperDefinitionUpdate,
    db: Session = Depends(db_session),
) -> models.CopperDefinition:
    definition = db.get(models.CopperDefinition, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Copper definition not found")
    for field, value in payload.model_dump().items():
        setattr(definition, field, value)
    db.commit()
    definition = (
        db.query(models.CopperDefinition)
        .options(*_load_opts())
        .filter(models.CopperDefinition.id == definition_id)
        .first()
    )
    return definition


@router.delete("/copper-definitions/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_copper_definition(definition_id: int, db: Session = Depends(db_session)) -> None:
    definition = db.get(models.CopperDefinition, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Copper definition not found")
    usage_count = (
        db.query(models.ProjectCopper)
        .filter(models.ProjectCopper.copper_definition_id == definition_id)
        .count()
    )
    usage_count += (
        db.query(models.CopperSettings)
        .filter(
            (models.CopperSettings.main_copper_definition_id == definition_id)
            | (models.CopperSettings.branch_copper_definition_id == definition_id)
        )
        .count()
    )
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bu bakır {usage_count} projede kullanılıyor, silinemez.",
        )
    db.delete(definition)
    db.commit()
