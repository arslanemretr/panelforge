from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import db_session
from app.db import models
from app.schemas.panel import PanelUpsert
from app.schemas.project_panel import ProjectPanelCreate, ProjectPanelRead

router = APIRouter(tags=["project-panels"])


def _load_options():
    """Tüm endpoint'lerde kullanılan ortak selectinload zinciri."""
    return selectinload(models.ProjectPanel.panel_definition).selectinload(
        models.PanelDefinition.panel_type
    )


def _sync_aggregate_panel(db: Session, project_id: int) -> None:
    items = (
        db.query(models.ProjectPanel)
        .options(selectinload(models.ProjectPanel.panel_definition))
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )

    if not items:
        panel = db.query(models.Panel).filter(models.Panel.project_id == project_id).one_or_none()
        if panel is not None:
            db.delete(panel)
            db.commit()
        return

    first = items[0].panel_definition
    total_width = sum(
        (item.panel_definition.width_mm * item.quantity for item in items), Decimal("0")
    )
    max_height = max(
        (item.panel_definition.height_mm for item in items), default=Decimal("0")
    )
    max_depth = max(
        (item.panel_definition.depth_mm or Decimal("0") for item in items), default=Decimal("0")
    )
    total_mounting_width = sum(
        ((item.panel_definition.mounting_plate_width_mm or Decimal("0")) * item.quantity for item in items), Decimal("0")
    )
    max_mounting_height = max(
        (item.panel_definition.mounting_plate_height_mm or Decimal("0") for item in items), default=Decimal("0")
    )

    payload = PanelUpsert(
        width_mm=total_width,
        height_mm=max_height,
        depth_mm=max_depth,
        mounting_plate_width_mm=total_mounting_width if total_mounting_width > 0 else None,
        mounting_plate_height_mm=max_mounting_height if max_mounting_height > 0 else None,
        left_margin_mm=first.left_margin_mm,
        right_margin_mm=first.right_margin_mm,
        top_margin_mm=first.top_margin_mm,
        bottom_margin_mm=first.bottom_margin_mm,
        busbar_orientation=first.busbar_orientation,
        phase_system=first.phase_system,
        busbar_rail_offset_mm=first.busbar_rail_offset_mm,
        busbar_end_setback_mm=first.busbar_end_setback_mm,
    )

    panel = db.query(models.Panel).filter(models.Panel.project_id == project_id).one_or_none()
    if panel is None:
        panel = models.Panel(project_id=project_id, **payload.model_dump())
        db.add(panel)
    else:
        for field, value in payload.model_dump().items():
            setattr(panel, field, value)
    db.commit()


@router.get("/projects/{project_id}/panel-layout", response_model=list[ProjectPanelRead])
def list_project_panels(project_id: int, db: Session = Depends(db_session)) -> list[models.ProjectPanel]:
    return (
        db.query(models.ProjectPanel)
        .options(_load_options())
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )


@router.post("/projects/{project_id}/panel-layout", response_model=ProjectPanelRead, status_code=status.HTTP_201_CREATED)
def create_project_panel(
    project_id: int,
    payload: ProjectPanelCreate,
    db: Session = Depends(db_session),
) -> models.ProjectPanel:
    definition = db.get(models.PanelDefinition, payload.panel_definition_id)
    if definition is None:
        raise HTTPException(status_code=404, detail="Panel definition not found")

    next_seq = (
        db.query(models.ProjectPanel.seq)
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.desc())
        .limit(1)
        .scalar()
        or 0
    )
    item = models.ProjectPanel(
        project_id=project_id,
        panel_definition_id=payload.panel_definition_id,
        label=payload.label or definition.name,
        seq=next_seq + 1,
        quantity=max(1, payload.quantity),
    )
    db.add(item)
    db.commit()
    _sync_aggregate_panel(db, project_id)
    return (
        db.query(models.ProjectPanel)
        .options(_load_options())
        .filter(models.ProjectPanel.id == item.id)
        .one()
    )


class ReorderRequest(BaseModel):
    direction: Literal["up", "down"]


class UpdateLabelRequest(BaseModel):
    label: str


@router.put("/projects/{project_id}/panel-layout/{project_panel_id}/reorder", response_model=list[ProjectPanelRead])
def reorder_project_panel(
    project_id: int,
    project_panel_id: int,
    payload: ReorderRequest,
    db: Session = Depends(db_session),
) -> list[models.ProjectPanel]:
    items = (
        db.query(models.ProjectPanel)
        .options(selectinload(models.ProjectPanel.panel_definition))
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )
    idx = next((i for i, it in enumerate(items) if it.id == project_panel_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Project panel not found")

    if payload.direction == "up" and idx > 0:
        items[idx].seq, items[idx - 1].seq = items[idx - 1].seq, items[idx].seq
    elif payload.direction == "down" and idx < len(items) - 1:
        items[idx].seq, items[idx + 1].seq = items[idx + 1].seq, items[idx].seq

    db.commit()
    _sync_aggregate_panel(db, project_id)

    return (
        db.query(models.ProjectPanel)
        .options(_load_options())
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )


@router.patch("/projects/{project_id}/panel-layout/{project_panel_id}", response_model=ProjectPanelRead)
def update_project_panel_label(
    project_id: int,
    project_panel_id: int,
    payload: UpdateLabelRequest,
    db: Session = Depends(db_session),
) -> models.ProjectPanel:
    item = (
        db.query(models.ProjectPanel)
        .options(_load_options())
        .filter(models.ProjectPanel.project_id == project_id, models.ProjectPanel.id == project_panel_id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project panel not found")
    item.label = payload.label.strip() or item.panel_definition.name
    db.commit()
    return (
        db.query(models.ProjectPanel)
        .options(_load_options())
        .filter(models.ProjectPanel.id == item.id)
        .one()
    )


@router.delete("/projects/{project_id}/panel-layout/{project_panel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_panel(project_id: int, project_panel_id: int, db: Session = Depends(db_session)) -> None:
    item = (
        db.query(models.ProjectPanel)
        .filter(models.ProjectPanel.project_id == project_id, models.ProjectPanel.id == project_panel_id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Project panel not found")
    db.delete(item)
    db.commit()

    remaining = (
        db.query(models.ProjectPanel)
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )
    for index, panel_item in enumerate(remaining, start=1):
        panel_item.seq = index
    db.commit()
    _sync_aggregate_panel(db, project_id)
