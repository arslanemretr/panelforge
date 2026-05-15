"""terminal slot fields

Revision ID: 0023_terminal_slot_fields
Revises: 0022_phase_labels_and_types
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0023_terminal_slot_fields"
down_revision = "0022_phase_labels_and_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("slot_width_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "terminal_definitions",
        sa.Column("slot_length_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "slot_length_mm")
    op.drop_column("terminal_definitions", "slot_width_mm")
