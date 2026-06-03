from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session, require_admin
from app.core.security import hash_password
from app.db import models
from app.schemas.user import AdminPasswordReset, UserCreate, UserRead, UserUpdate

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserRead])
def list_users(
    _: models.User = Depends(require_admin),
    db: Session = Depends(db_session),
) -> list[models.User]:
    return db.query(models.User).order_by(models.User.full_name.asc()).all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(db_session),
) -> models.User:
    existing = db.query(models.User).filter(models.User.email == payload.email).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı")

    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_admin: models.User = Depends(require_admin),
    db: Session = Depends(db_session),
) -> models.User:
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    # Admin kendini deactive edemez
    if user_id == current_admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı devre dışı bırakamazsınız")

    user.full_name = payload.full_name
    user.role = payload.role
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def admin_reset_password(
    user_id: int,
    payload: AdminPasswordReset,
    _: models.User = Depends(require_admin),
    db: Session = Depends(db_session),
) -> None:
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
