"""client_projects

Revision ID: 0033_client_projects
Revises: 0032_firms
Create Date: 2026-06-02

Firma'ya bağlı proje (Proje Kodu + Proje Adı) tablosunu oluşturur.
Mevcut bakır projeleri (projects tablosu) bu projelere bağlanacak.
"""

from alembic import op
import sqlalchemy as sa

revision = "0033_client_projects"
down_revision = "0032_firms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "client_projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "firm_id",
            sa.Integer(),
            sa.ForeignKey("firms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("client_projects")
