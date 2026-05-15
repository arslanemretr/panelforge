"""terminal fin fields

Revision ID: 0024_terminal_fin_fields
Revises: 0023_terminal_slot_fields
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0024_terminal_fin_fields"
down_revision = "0023_terminal_slot_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("fin_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "terminal_definitions",
        sa.Column("fin_spacing_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "fin_spacing_mm")
    op.drop_column("terminal_definitions", "fin_count")
