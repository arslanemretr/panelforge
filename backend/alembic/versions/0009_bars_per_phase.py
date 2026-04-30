"""add bars_per_phase and bar_gap_mm to copper_settings

Revision ID: 0009_bars_per_phase
Revises: 0008_3d_fields
Create Date: 2026-04-30
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_bars_per_phase"
down_revision = "0008_3d_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "copper_settings",
        sa.Column("bars_per_phase", sa.Integer(), nullable=True, server_default="1"),
    )
    op.add_column(
        "copper_settings",
        sa.Column("bar_gap_mm", sa.Numeric(), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("copper_settings", "bar_gap_mm")
    op.drop_column("copper_settings", "bars_per_phase")
