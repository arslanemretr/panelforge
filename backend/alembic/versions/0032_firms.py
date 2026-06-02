"""firms

Revision ID: 0032_firms
Revises: 0031_connection_bend_branch
Create Date: 2026-06-02

Firma (şirket) tablosunu oluşturur.
"""

from alembic import op
import sqlalchemy as sa

revision = "0032_firms"
down_revision = "0031_connection_bend_branch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "firms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("vkn", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("firms")
