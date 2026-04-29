from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.panel_definition import (
    PanelDefinitionCreate,
    PanelDefinitionRead,
    PanelDefinitionUpdate,
)

router = APIRouter(tags=["panel-definitions"])


@router.get("/panel-definitions", response_model=list[PanelDefinitionRead])
def list_panel_definitions(db: Session = Depends(db_session)) -> list[models.PanelDefinition]:
    return db.query(models.PanelDefinition).order_by(models.PanelDefinition.updated_at.desc()).all()


@router.post("/panel-definitions", response_model=PanelDefinitionRead, status_code=status.HTTP_201_CREATED)
def create_panel_definition(payload: PanelDefinitionCreate, db: Session = Depends(db_session)) -> models.PanelDefinition:
    definition = models.PanelDefinition(**payload.model_dump())
    db.add(definition)
    db.commit()
    db.refresh(definition)
    return definition


@router.get("/panel-definitions/{definition_id}", response_model=PanelDefinitionRead)
def get_panel_definition(definition_id: int, db: Session = Depends(db_session)) -> models.PanelDefinition:
    definition = db.get(models.PanelDefinition, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Panel definition not found")
    return definition


@router.put("/panel-definitions/{definition_id}", response_model=PanelDefinitionRead)
def update_panel_definition(
    definition_id: int,
    payload: PanelDefinitionUpdate,
    db: Session = Depends(db_session),
) -> models.PanelDefinition:
    definition = db.get(models.PanelDefinition, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Panel definition not found")
    for field, value in payload.model_dump().items():
        setattr(definition, field, value)
    db.commit()
    db.refresh(definition)
    return definition


@router.delete("/panel-definitions/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_panel_definition(definition_id: int, db: Session = Depends(db_session)) -> None:
    definition = db.get(models.PanelDefinition, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Panel definition not found")
    db.delete(definition)
    db.commit()
