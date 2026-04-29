"""add busbar placement fields to copper_settings

Revision ID: 0007_busbar_placement
Revises: 0006_project_device_panel
Create Date: 2026-04-29
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007_busbar_placement"
down_revision = "0006_project_device_panel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("copper_settings", sa.Column("busbar_x_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_settings", sa.Column("busbar_y_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_settings", sa.Column("busbar_z_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_settings", sa.Column("busbar_orientation", sa.Text(), nullable=True, server_default="horizontal"))
    op.add_column("copper_settings", sa.Column("busbar_length_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_settings", sa.Column("busbar_phase_count", sa.Integer(), nullable=True, server_default="3"))


def downgrade() -> None:
    op.drop_column("copper_settings", "busbar_phase_count")
    op.drop_column("copper_settings", "busbar_length_mm")
    op.drop_column("copper_settings", "busbar_orientation")
    op.drop_column("copper_settings", "busbar_z_mm")
    op.drop_column("copper_settings", "busbar_y_mm")
    op.drop_column("copper_settings", "busbar_x_mm")
