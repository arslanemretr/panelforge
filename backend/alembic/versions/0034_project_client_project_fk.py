"""project_client_project_fk

Revision ID: 0034_project_client_project_fk
Revises: 0033_client_projects
Create Date: 2026-06-02

projects tablosuna client_project_id FK'sı ekler (nullable).
Mevcut kayıtlar bozulmaz — NULL olarak kalır.
"""

from alembic import op
import sqlalchemy as sa

revision = "0034_project_client_project_fk"
down_revision = "0033_client_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "client_project_id",
            sa.Integer(),
            sa.ForeignKey("client_projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "client_project_id")
