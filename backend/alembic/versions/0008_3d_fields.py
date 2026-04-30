"""add 3D fields: terminal z/face, device z/rotations, busbar plane/axis, segment/hole/bend 3D

Revision ID: 0008_3d_fields
Revises: 0007_busbar_placement
Create Date: 2026-04-30
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_3d_fields"
down_revision = "0007_busbar_placement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── device_terminals: z_mm + terminal_face ────────────────────────────────
    op.add_column("device_terminals", sa.Column("z_mm", sa.Numeric(), nullable=True, server_default="0"))
    op.add_column("device_terminals", sa.Column("terminal_face", sa.Text(), nullable=True))

    # ── project_devices: z_mm + rotation_x_deg + rotation_y_deg ─────────────
    op.add_column("project_devices", sa.Column("z_mm", sa.Numeric(), nullable=True, server_default="0"))
    op.add_column("project_devices", sa.Column("rotation_x_deg", sa.Numeric(), nullable=True, server_default="0"))
    op.add_column("project_devices", sa.Column("rotation_y_deg", sa.Numeric(), nullable=True, server_default="0"))

    # ── copper_settings: busbar_plane + phase_stack_axis ─────────────────────
    op.add_column("copper_settings", sa.Column("busbar_plane", sa.Text(), nullable=True, server_default="XY"))
    op.add_column("copper_settings", sa.Column("phase_stack_axis", sa.Text(), nullable=True, server_default="Y"))

    # ── busbar_segments: start_z_mm + end_z_mm ───────────────────────────────
    op.add_column("busbar_segments", sa.Column("start_z_mm", sa.Numeric(), nullable=True, server_default="0"))
    op.add_column("busbar_segments", sa.Column("end_z_mm", sa.Numeric(), nullable=True, server_default="0"))

    # ── busbar_holes: face ────────────────────────────────────────────────────
    op.add_column("busbar_holes", sa.Column("face", sa.Text(), nullable=True))

    # ── busbar_bends: bend_axis + bend_type + bend_allowance_mm ──────────────
    op.add_column("busbar_bends", sa.Column("bend_axis", sa.Text(), nullable=True))
    op.add_column("busbar_bends", sa.Column("bend_type", sa.Text(), nullable=True))
    op.add_column("busbar_bends", sa.Column("bend_allowance_mm", sa.Numeric(), nullable=True))


def downgrade() -> None:
    op.drop_column("busbar_bends", "bend_allowance_mm")
    op.drop_column("busbar_bends", "bend_type")
    op.drop_column("busbar_bends", "bend_axis")

    op.drop_column("busbar_holes", "face")

    op.drop_column("busbar_segments", "end_z_mm")
    op.drop_column("busbar_segments", "start_z_mm")

    op.drop_column("copper_settings", "phase_stack_axis")
    op.drop_column("copper_settings", "busbar_plane")

    op.drop_column("project_devices", "rotation_y_deg")
    op.drop_column("project_devices", "rotation_x_deg")
    op.drop_column("project_devices", "z_mm")

    op.drop_column("device_terminals", "terminal_face")
    op.drop_column("device_terminals", "z_mm")
