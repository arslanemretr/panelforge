"""client_project_dates

Revision ID: 0035_client_project_dates
Revises: 0034_project_client_project_fk
Create Date: 2026-06-02

client_projects tablosuna anlaşma tarihi ve planlanan tamamlanma tarihi ekler.
"""

from alembic import op
import sqlalchemy as sa

revision = "0035_client_project_dates"
down_revision = "0034_project_client_project_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("client_projects", sa.Column("agreement_date", sa.Date(), nullable=True))
    op.add_column("client_projects", sa.Column("planned_completion_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("client_projects", "planned_completion_date")
    op.drop_column("client_projects", "agreement_date")
