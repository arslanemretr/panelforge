"""device_connections table

Explicit source→target connection model.
source_type = "busbar" | "device"
connection_type = "main_to_device" | "device_to_device"

Revision ID: 0012_device_connections
Revises: 0011_terminal_role_group
Create Date: 2026-05-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012_device_connections"
down_revision = "0011_terminal_role_group"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Kaynak
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column(
            "source_device_id",
            sa.Integer(),
            sa.ForeignKey("project_devices.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "source_terminal_id",
            sa.Integer(),
            sa.ForeignKey("device_terminals.id", ondelete="CASCADE"),
            nullable=True,
        ),
        # Hedef
        sa.Column(
            "target_device_id",
            sa.Integer(),
            sa.ForeignKey("project_devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_terminal_id",
            sa.Integer(),
            sa.ForeignKey("device_terminals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phase", sa.Text(), nullable=False),
        sa.Column("connection_type", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("device_connections")
