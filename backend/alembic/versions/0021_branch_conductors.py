"""branch_conductors table

Revision ID: 0021_branch_conductors
Revises: 0020_bend_types
Create Date: 2026-05-14
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0021_branch_conductors"
down_revision = "0020_bend_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "branch_conductors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("conductor_kind", sa.Text(), nullable=False, server_default="dahili"),
        # Malzeme
        sa.Column("copper_definition_id", sa.Integer(),
                  sa.ForeignKey("copper_definitions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("width_mm", sa.Numeric(), nullable=True),
        # Büküm tipi
        sa.Column("bend_type_id", sa.Integer(),
                  sa.ForeignKey("bend_types.id", ondelete="SET NULL"), nullable=True),
        # Cihaz / Terminal
        sa.Column("device_id", sa.Integer(),
                  sa.ForeignKey("devices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("terminal_label", sa.Text(), nullable=True),
        # Elektrik
        sa.Column("phase", sa.Text(), nullable=True),
        sa.Column("parallel_count", sa.Integer(), nullable=False, server_default="1"),
        # Bağlantı noktaları
        sa.Column("start_point", sa.Text(), nullable=True),
        sa.Column("end_point", sa.Text(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("branch_conductors")
