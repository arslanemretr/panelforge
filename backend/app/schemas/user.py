from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel

ROLES = ("admin", "engineer", "operator", "viewer")


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "engineer"


class UserUpdate(BaseModel):
    full_name: str
    role: str
    is_active: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class AdminPasswordReset(BaseModel):
    new_password: str


class UserRead(ORMModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
