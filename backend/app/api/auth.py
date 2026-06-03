from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import db_session, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import models
from app.schemas.auth import LoginRequest, RefreshRequest, Token
from app.schemas.user import PasswordChange, UserRead

router = APIRouter(tags=["auth"])


def _make_token(user: models.User) -> Token:
    return Token(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/auth/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> Token:
    user = db.query(models.User).filter(models.User.email == payload.email).one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap devre dışı",
        )
    return _make_token(user)


@router.post("/auth/refresh", response_model=Token)
def refresh(payload: RefreshRequest, db: Session = Depends(db_session)) -> Token:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş refresh token",
    )
    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise credentials_exc

    user_id = int(data["sub"]) if data.get("sub") else None
    if user_id is None:
        raise credentials_exc

    user = db.get(models.User, user_id)
    if user is None or not user.is_active:
        raise credentials_exc

    return _make_token(user)


@router.get("/auth/me", response_model=UserRead)
def me(current_user: models.User = Depends(get_current_user)) -> models.User:
    return current_user


@router.put("/auth/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> None:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
