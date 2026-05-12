"""add panel_types table and origin/panel_type fields to panel_definitions

Revision ID: 0017_panel_type_and_origin
Revises: 0016_copper_kind_proj
Create Date: 2026-05-12

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0017_panel_type_and_origin"
down_revision = "0016_copper_kind_proj"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "panel_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text(), nullable=False, unique=True),
    )
    op.execute("INSERT INTO panel_types (name) VALUES ('Montaj Plakalı'), ('Perde Saçlı'), ('Ön Kapaklı')")

    op.add_column(
        "panel_definitions",
        sa.Column(
            "panel_type_id",
            sa.Integer(),
            sa.ForeignKey("panel_types.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "panel_definitions",
        sa.Column("origin_x_mm", sa.Numeric(), nullable=False, server_default="0"),
    )
    op.add_column(
        "panel_definitions",
        sa.Column("origin_y_mm", sa.Numeric(), nullable=False, server_default="0"),
    )
    op.add_column(
        "panel_definitions",
        sa.Column("origin_z_mm", sa.Numeric(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("panel_definitions", "origin_z_mm")
    op.drop_column("panel_definitions", "origin_y_mm")
    op.drop_column("panel_definitions", "origin_x_mm")
    op.drop_column("panel_definitions", "panel_type_id")
    op.drop_table("panel_types")
