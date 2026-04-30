"""copper density fields

Adds density_g_cm3 to copper_definitions and
main_density_g_cm3 / branch_density_g_cm3 to copper_settings.

Revision ID: 0010_copper_density
Revises: 0009_bars_per_phase
Create Date: 2026-04-30
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0010_copper_density"
down_revision = "0009_bars_per_phase"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "copper_definitions",
        sa.Column("density_g_cm3", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "copper_settings",
        sa.Column("main_density_g_cm3", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "copper_settings",
        sa.Column("branch_density_g_cm3", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("copper_definitions", "density_g_cm3")
    op.drop_column("copper_settings", "main_density_g_cm3")
    op.drop_column("copper_settings", "branch_density_g_cm3")
