from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class ProjectBase(BaseModel):
    name: str
    customer_name: str | None = None
    panel_code: str | None = None
    prepared_by: str | None = None
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
