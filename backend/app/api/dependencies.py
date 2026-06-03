from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db import models
from app.db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def db_session(db: Session = Depends(get_db)) -> Session:
    return db


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(db_session),
) -> models.User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exc

    user_id: int | None = int(payload["sub"]) if payload.get("sub") else None
    if user_id is None:
        raise credentials_exc

    user = db.get(models.User, user_id)
    if user is None or not user.is_active:
        raise credentials_exc

    return user


def require_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Viewer dahil tüm aktif kullanıcılar."""
    return current_user


def require_operator(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Proje içi işlemler: operator + engineer + admin."""
    if current_user.role not in ("admin", "engineer", "operator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetki yetersiz")
    return current_user


def require_engineer(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Proje/tanımlama CRUD: engineer + admin."""
    if current_user.role not in ("admin", "engineer"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetki yetersiz")
    return current_user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Sadece admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetki yetersiz")
    return current_user
