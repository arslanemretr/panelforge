"""add copper kind and project copper selections

Revision ID: 0016_copper_kind_proj
Revises: 0015_batch_features
Create Date: 2026-05-01

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0016_copper_kind_proj"
down_revision = "0015_batch_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "copper_definitions",
        sa.Column("copper_kind", sa.Text(), nullable=False, server_default="main"),
    )
    op.add_column("copper_definitions", sa.Column("busbar_x_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_definitions", sa.Column("busbar_y_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_definitions", sa.Column("busbar_z_mm", sa.Numeric(), nullable=True))
    op.add_column("copper_definitions", sa.Column("busbar_orientation", sa.Text(), nullable=True))
    op.add_column("copper_definitions", sa.Column("busbar_length_mm", sa.Numeric(), nullable=True))

    op.add_column("copper_settings", sa.Column("main_copper_definition_id", sa.Integer(), nullable=True))
    op.add_column("copper_settings", sa.Column("branch_copper_definition_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("copper_settings", "branch_copper_definition_id")
    op.drop_column("copper_settings", "main_copper_definition_id")

    op.drop_column("copper_definitions", "busbar_length_mm")
    op.drop_column("copper_definitions", "busbar_orientation")
    op.drop_column("copper_definitions", "busbar_z_mm")
    op.drop_column("copper_definitions", "busbar_y_mm")
    op.drop_column("copper_definitions", "busbar_x_mm")
    op.drop_column("copper_definitions", "copper_kind")
