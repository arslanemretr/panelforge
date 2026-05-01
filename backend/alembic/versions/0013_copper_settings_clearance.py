"""copper_settings clearance + edgewise k_factor fields

Adds k_factor_edgewise, busbar_clearance_mm, branch_clearance_mm,
min_hole_hole_distance_mm to copper_settings.

Revision ID: 0013_copper_settings_clearance
Revises: 0012_device_connections
Create Date: 2026-05-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0013_copper_settings_clearance"
down_revision = "0012_device_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "copper_settings",
        sa.Column("k_factor_edgewise", sa.Numeric(), nullable=True, server_default="0.40"),
    )
    op.add_column(
        "copper_settings",
        sa.Column("busbar_clearance_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "copper_settings",
        sa.Column("branch_clearance_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "copper_settings",
        sa.Column("min_hole_hole_distance_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("copper_settings", "k_factor_edgewise")
    op.drop_column("copper_settings", "busbar_clearance_mm")
    op.drop_column("copper_settings", "branch_clearance_mm")
    op.drop_column("copper_settings", "min_hole_hole_distance_mm")
