from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.db import models
from app.schemas.terminal_definition import (
    TerminalDefinitionCreate,
    TerminalDefinitionRead,
    TerminalDefinitionUpdate,
)

router = APIRouter(tags=["terminal-definitions"])


@router.get("/terminal-definitions", response_model=list[TerminalDefinitionRead])
def list_terminal_definitions(db: Session = Depends(db_session)) -> list[models.TerminalDefinition]:
    return (
        db.query(models.TerminalDefinition)
        .order_by(models.TerminalDefinition.name.asc())
        .all()
    )


@router.post(
    "/terminal-definitions",
    response_model=TerminalDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_terminal_definition(
    payload: TerminalDefinitionCreate,
    db: Session = Depends(db_session),
) -> models.TerminalDefinition:
    existing = (
        db.query(models.TerminalDefinition)
        .filter(models.TerminalDefinition.name == payload.name.strip())
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Bu isimde bir terminal tipi zaten mevcut.")
    obj = models.TerminalDefinition(**payload.model_dump())
    obj.name = obj.name.strip()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/terminal-definitions/{def_id}", response_model=TerminalDefinitionRead)
def update_terminal_definition(
    def_id: int,
    payload: TerminalDefinitionUpdate,
    db: Session = Depends(db_session),
) -> models.TerminalDefinition:
    obj = db.get(models.TerminalDefinition, def_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Terminal tipi bulunamadı.")
    for key, value in payload.model_dump(exclude_unset=False).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/terminal-definitions/{def_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_terminal_definition(
    def_id: int,
    db: Session = Depends(db_session),
) -> None:
    obj = db.get(models.TerminalDefinition, def_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Terminal tipi bulunamadı.")
    # Bağlı terminal var mı kontrol et
    linked = (
        db.query(models.DeviceTerminal)
        .filter(models.DeviceTerminal.terminal_definition_id == def_id)
        .first()
    )
    if linked:
        raise HTTPException(
            status_code=409,
            detail="Bu terminal tipi bir veya daha fazla cihaz terminalinde kullanılıyor, silinemez.",
        )
    db.delete(obj)
    db.commit()
