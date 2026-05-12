"""copper phase layout fields

Revision ID: 0018_copper_phase_layout
Revises: 0017_panel_type_and_origin
Create Date: 2026-05-13
"""

import sqlalchemy as sa
from alembic import op

revision = "0018_copper_phase_layout"
down_revision = "0017_panel_type_and_origin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("copper_definitions", sa.Column("phase_type", sa.Text(), nullable=True))
    op.add_column("copper_definitions", sa.Column("bars_per_phase", sa.Integer(), server_default="1", nullable=True))
    op.add_column("copper_definitions", sa.Column("bar_gap_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_definitions", sa.Column("phase_center_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_definitions", sa.Column("layer_type", sa.Text(), server_default="Tek Kat", nullable=True))
    op.add_column("copper_definitions", sa.Column("neutral_bar_count", sa.Integer(), server_default="1", nullable=True))


def downgrade() -> None:
    op.drop_column("copper_definitions", "neutral_bar_count")
    op.drop_column("copper_definitions", "layer_type")
    op.drop_column("copper_definitions", "phase_center_mm")
    op.drop_column("copper_definitions", "bar_gap_mm")
    op.drop_column("copper_definitions", "bars_per_phase")
    op.drop_column("copper_definitions", "phase_type")
