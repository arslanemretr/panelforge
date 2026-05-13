from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.database import get_db
from app.db.models import BendParameter, BendSegment, BendType, BranchConductor
from app.schemas.branch_conductor import (
    BranchConductorCreate,
    BranchConductorListItem,
    BranchConductorRead,
    BranchConductorUpdate,
)

router = APIRouter(tags=["branch-conductors"])


def _load_full(id: int, db: Session) -> BranchConductor:
    row = db.execute(
        select(BranchConductor)
        .where(BranchConductor.id == id)
        .options(
            selectinload(BranchConductor.copper_definition),
            selectinload(BranchConductor.bend_type)
            .selectinload(BendType.parameters),
            selectinload(BranchConductor.bend_type)
            .selectinload(BendType.segments),
            selectinload(BranchConductor.device),
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Branch conductor not found")
    return row


@router.get("/branch-conductors", response_model=list[BranchConductorListItem])
def list_branch_conductors(db: Session = Depends(get_db)):
    rows = db.execute(
        select(BranchConductor)
        .options(
            selectinload(BranchConductor.copper_definition),
            selectinload(BranchConductor.bend_type),
            selectinload(BranchConductor.device),
        )
        .order_by(BranchConductor.name)
    ).scalars().all()
    return rows


@router.get("/branch-conductors/{id}", response_model=BranchConductorRead)
def get_branch_conductor(id: int, db: Session = Depends(get_db)):
    return _load_full(id, db)


@router.post("/branch-conductors", response_model=BranchConductorRead, status_code=201)
def create_branch_conductor(
    payload: BranchConductorCreate, db: Session = Depends(get_db)
):
    obj = BranchConductor(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _load_full(obj.id, db)


@router.put("/branch-conductors/{id}", response_model=BranchConductorRead)
def update_branch_conductor(
    id: int, payload: BranchConductorUpdate, db: Session = Depends(get_db)
):
    obj = db.get(BranchConductor, id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Branch conductor not found")
    for field, value in payload.model_dump().items():
        setattr(obj, field, value)
    db.commit()
    return _load_full(id, db)


@router.delete("/branch-conductors/{id}", status_code=204)
def delete_branch_conductor(id: int, db: Session = Depends(get_db)):
    obj = db.get(BranchConductor, id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Branch conductor not found")
    db.delete(obj)
    db.commit()
