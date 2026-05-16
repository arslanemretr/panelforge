"""terminal fin length and plate thickness fields

Revision ID: 0027_terminal_fin_length_plate
Revises: 0026_terminal_fin_thickness
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0027_terminal_fin_length_plate"
down_revision = "0026_terminal_fin_thickness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("fin_length_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "terminal_definitions",
        sa.Column("plate_thickness_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "plate_thickness_mm")
    op.drop_column("terminal_definitions", "fin_length_mm")
