"""project_panel geometry fields (project-specific copy from library)

Revision ID: 0029_project_panel_geometry
Revises: 0028_terminal_fin_offset
Create Date: 2026-05-17
"""
from decimal import Decimal

import sqlalchemy as sa
from alembic import op

revision = "0029_project_panel_geometry"
down_revision = "0028_terminal_fin_offset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_panels", sa.Column("width_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("height_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("depth_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("mounting_plate_width_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("mounting_plate_height_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("left_margin_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("right_margin_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("top_margin_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("bottom_margin_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("busbar_orientation", sa.Text(), nullable=True))
    op.add_column("project_panels", sa.Column("phase_system", sa.Text(), nullable=True))
    op.add_column("project_panels", sa.Column("busbar_rail_offset_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("busbar_end_setback_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("origin_x_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("origin_y_mm", sa.Numeric(), nullable=True))
    op.add_column("project_panels", sa.Column("origin_z_mm", sa.Numeric(), nullable=True))

    # Backfill geometry from panel_definitions for existing rows
    op.execute("""
        UPDATE project_panels pp
        SET
            width_mm              = pd.width_mm,
            height_mm             = pd.height_mm,
            depth_mm              = pd.depth_mm,
            mounting_plate_width_mm  = pd.mounting_plate_width_mm,
            mounting_plate_height_mm = pd.mounting_plate_height_mm,
            left_margin_mm        = pd.left_margin_mm,
            right_margin_mm       = pd.right_margin_mm,
            top_margin_mm         = pd.top_margin_mm,
            bottom_margin_mm      = pd.bottom_margin_mm,
            busbar_orientation    = pd.busbar_orientation,
            phase_system          = pd.phase_system,
            busbar_rail_offset_mm = pd.busbar_rail_offset_mm,
            busbar_end_setback_mm = pd.busbar_end_setback_mm,
            origin_x_mm           = pd.origin_x_mm,
            origin_y_mm           = pd.origin_y_mm,
            origin_z_mm           = pd.origin_z_mm
        FROM panel_definitions pd
        WHERE pp.panel_definition_id = pd.id
    """)

    # Fill any remaining NULLs with safe defaults
    op.execute("""
        UPDATE project_panels SET
            width_mm       = 100  WHERE width_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            height_mm      = 200  WHERE height_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            left_margin_mm   = 0 WHERE left_margin_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            right_margin_mm  = 0 WHERE right_margin_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            top_margin_mm    = 0 WHERE top_margin_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            bottom_margin_mm = 0 WHERE bottom_margin_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            origin_x_mm = 0 WHERE origin_x_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            origin_y_mm = 0 WHERE origin_y_mm IS NULL;
    """)
    op.execute("""
        UPDATE project_panels SET
            origin_z_mm = 0 WHERE origin_z_mm IS NULL;
    """)

    # Now make non-nullable columns NOT NULL
    op.alter_column("project_panels", "width_mm", nullable=False)
    op.alter_column("project_panels", "height_mm", nullable=False)
    op.alter_column("project_panels", "left_margin_mm", nullable=False)
    op.alter_column("project_panels", "right_margin_mm", nullable=False)
    op.alter_column("project_panels", "top_margin_mm", nullable=False)
    op.alter_column("project_panels", "bottom_margin_mm", nullable=False)
    op.alter_column("project_panels", "origin_x_mm", nullable=False)
    op.alter_column("project_panels", "origin_y_mm", nullable=False)
    op.alter_column("project_panels", "origin_z_mm", nullable=False)


def downgrade() -> None:
    for col in [
        "width_mm", "height_mm", "depth_mm",
        "mounting_plate_width_mm", "mounting_plate_height_mm",
        "left_margin_mm", "right_margin_mm", "top_margin_mm", "bottom_margin_mm",
        "busbar_orientation", "phase_system",
        "busbar_rail_offset_mm", "busbar_end_setback_mm",
        "origin_x_mm", "origin_y_mm", "origin_z_mm",
    ]:
        op.drop_column("project_panels", col)
