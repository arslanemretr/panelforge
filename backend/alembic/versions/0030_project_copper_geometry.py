"""project_copper_geometry

Revision ID: 0030_project_copper_geometry
Revises: 0029_project_panel_geometry
Create Date: 2026-05-17

Adds per-project editable geometry fields to project_coppers,
mirroring the ProjectPanel pattern from migration 0029.
"""

from alembic import op
import sqlalchemy as sa

revision = "0030_project_copper_geometry"
down_revision = "0029_project_panel_geometry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_coppers", sa.Column("main_width_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("main_thickness_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("busbar_x_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("busbar_y_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("busbar_z_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("busbar_orientation", sa.Text(), nullable=True))
    op.add_column("project_coppers", sa.Column(
        "phase_type_id", sa.Integer(),
        sa.ForeignKey("phase_types.id", ondelete="SET NULL"),
        nullable=True,
    ))
    op.add_column("project_coppers", sa.Column("bars_per_phase", sa.Integer(), nullable=True))
    op.add_column("project_coppers", sa.Column("bar_gap_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("phase_center_mm", sa.Numeric(), nullable=True))
    op.add_column("project_coppers", sa.Column("layer_type", sa.Text(), nullable=True))
    op.add_column("project_coppers", sa.Column("neutral_bar_count", sa.Integer(), nullable=True))

    # Backfill existing rows from their copper_definition
    op.execute("""
        UPDATE project_coppers pc
        SET
            main_width_mm     = cd.main_width_mm,
            main_thickness_mm = cd.main_thickness_mm,
            busbar_x_mm       = cd.busbar_x_mm,
            busbar_y_mm       = cd.busbar_y_mm,
            busbar_z_mm       = cd.busbar_z_mm,
            busbar_orientation= cd.busbar_orientation,
            phase_type_id     = cd.phase_type_id,
            bars_per_phase    = cd.bars_per_phase,
            bar_gap_mm        = cd.bar_gap_mm,
            phase_center_mm   = cd.phase_center_mm,
            layer_type        = cd.layer_type,
            neutral_bar_count = cd.neutral_bar_count
        FROM copper_definitions cd
        WHERE pc.copper_definition_id = cd.id
    """)


def downgrade() -> None:
    op.drop_column("project_coppers", "neutral_bar_count")
    op.drop_column("project_coppers", "layer_type")
    op.drop_column("project_coppers", "phase_center_mm")
    op.drop_column("project_coppers", "bar_gap_mm")
    op.drop_column("project_coppers", "bars_per_phase")
    op.drop_column("project_coppers", "phase_type_id")
    op.drop_column("project_coppers", "busbar_orientation")
    op.drop_column("project_coppers", "busbar_z_mm")
    op.drop_column("project_coppers", "busbar_y_mm")
    op.drop_column("project_coppers", "busbar_x_mm")
    op.drop_column("project_coppers", "main_thickness_mm")
    op.drop_column("project_coppers", "main_width_mm")
