"""definition libraries

Revision ID: 0002_definition_libraries
Revises: 0001_initial
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_definition_libraries"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "panel_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("width_mm", sa.Numeric(), nullable=False),
        sa.Column("height_mm", sa.Numeric(), nullable=False),
        sa.Column("depth_mm", sa.Numeric(), nullable=True),
        sa.Column("mounting_plate_width_mm", sa.Numeric(), nullable=True),
        sa.Column("mounting_plate_height_mm", sa.Numeric(), nullable=True),
        sa.Column("left_margin_mm", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("right_margin_mm", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("top_margin_mm", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("bottom_margin_mm", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("busbar_orientation", sa.Text(), nullable=True),
        sa.Column("phase_system", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "copper_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("main_width_mm", sa.Numeric(), nullable=True),
        sa.Column("main_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("main_material", sa.Text(), server_default="Cu", nullable=False),
        sa.Column("main_phase_spacing_mm", sa.Numeric(), nullable=True),
        sa.Column("branch_width_mm", sa.Numeric(), nullable=True),
        sa.Column("branch_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("branch_material", sa.Text(), server_default="Cu", nullable=False),
        sa.Column("branch_phase_spacing_mm", sa.Numeric(), nullable=True),
        sa.Column("bend_inner_radius_mm", sa.Numeric(), nullable=True),
        sa.Column("min_hole_edge_distance_mm", sa.Numeric(), nullable=True),
        sa.Column("min_bend_hole_distance_mm", sa.Numeric(), nullable=True),
        sa.Column("default_hole_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("use_slot_holes", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("slot_width_mm", sa.Numeric(), nullable=True),
        sa.Column("slot_length_mm", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("copper_definitions")
    op.drop_table("panel_definitions")
