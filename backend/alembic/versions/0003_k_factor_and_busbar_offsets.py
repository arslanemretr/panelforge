"""k_factor and busbar offsets

Revision ID: 0003_k_factor_and_busbar_offsets
Revises: 0002_definition_libraries
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_k_factor_and_busbar_offsets"
down_revision = "0002_definition_libraries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("copper_settings",
        sa.Column("k_factor", sa.Numeric(), server_default="0.33", nullable=True))

    op.add_column("copper_definitions",
        sa.Column("k_factor", sa.Numeric(), server_default="0.33", nullable=True))

    op.add_column("panels",
        sa.Column("busbar_rail_offset_mm", sa.Numeric(), server_default="100", nullable=True))
    op.add_column("panels",
        sa.Column("busbar_end_setback_mm", sa.Numeric(), server_default="60", nullable=True))

    op.add_column("panel_definitions",
        sa.Column("busbar_rail_offset_mm", sa.Numeric(), server_default="100", nullable=True))
    op.add_column("panel_definitions",
        sa.Column("busbar_end_setback_mm", sa.Numeric(), server_default="60", nullable=True))


def downgrade() -> None:
    op.drop_column("copper_settings", "k_factor")
    op.drop_column("copper_definitions", "k_factor")
    op.drop_column("panels", "busbar_rail_offset_mm")
    op.drop_column("panels", "busbar_end_setback_mm")
    op.drop_column("panel_definitions", "busbar_rail_offset_mm")
    op.drop_column("panel_definitions", "busbar_end_setback_mm")
