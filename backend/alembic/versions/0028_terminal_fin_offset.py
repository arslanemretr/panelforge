"""terminal fin_offset_mm field

Revision ID: 0028_terminal_fin_offset
Revises: 0027_terminal_fin_length_plate
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0028_terminal_fin_offset"
down_revision = "0027_terminal_fin_length_plate"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("fin_offset_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "fin_offset_mm")
