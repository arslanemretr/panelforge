"""device terminal extended fields + device enclosure_type

Revision ID: 0014_device_terminal_extended
Revises: 0013_copper_settings_clearance
Create Date: 2026-05-01

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0014_device_terminal_extended"
down_revision = "0013_copper_settings_clearance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Device — kasa tipi
    op.add_column("devices", sa.Column("enclosure_type", sa.Text(), nullable=True))

    # DeviceTerminal — genişletilmiş alanlar
    op.add_column("device_terminals", sa.Column("terminal_type", sa.Text(), nullable=True))
    op.add_column("device_terminals", sa.Column("terminal_width_mm", sa.Numeric(), nullable=True))
    op.add_column("device_terminals", sa.Column("terminal_height_mm", sa.Numeric(), nullable=True))
    op.add_column("device_terminals", sa.Column("terminal_depth_mm", sa.Numeric(), nullable=True))
    op.add_column("device_terminals", sa.Column("bolt_type", sa.Text(), nullable=True))
    op.add_column("device_terminals", sa.Column("bolt_count", sa.Integer(), nullable=True))
    op.add_column("device_terminals", sa.Column("bolt_center_distance_mm", sa.Numeric(), nullable=True))


def downgrade() -> None:
    op.drop_column("device_terminals", "bolt_center_distance_mm")
    op.drop_column("device_terminals", "bolt_count")
    op.drop_column("device_terminals", "bolt_type")
    op.drop_column("device_terminals", "terminal_depth_mm")
    op.drop_column("device_terminals", "terminal_height_mm")
    op.drop_column("device_terminals", "terminal_width_mm")
    op.drop_column("device_terminals", "terminal_type")
    op.drop_column("devices", "enclosure_type")
