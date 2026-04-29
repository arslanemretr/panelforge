"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("customer_name", sa.Text(), nullable=True),
        sa.Column("panel_code", sa.Text(), nullable=True),
        sa.Column("prepared_by", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("device_type", sa.Text(), nullable=False),
        sa.Column("poles", sa.Integer(), nullable=False),
        sa.Column("current_a", sa.Numeric(), nullable=True),
        sa.Column("width_mm", sa.Numeric(), nullable=False),
        sa.Column("height_mm", sa.Numeric(), nullable=False),
        sa.Column("depth_mm", sa.Numeric(), nullable=True),
    )

    op.create_table(
        "panels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True),
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
    )

    op.create_table(
        "device_terminals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("terminal_name", sa.Text(), nullable=False),
        sa.Column("phase", sa.Text(), nullable=False),
        sa.Column("x_mm", sa.Numeric(), nullable=False),
        sa.Column("y_mm", sa.Numeric(), nullable=False),
        sa.Column("hole_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("slot_width_mm", sa.Numeric(), nullable=True),
        sa.Column("slot_length_mm", sa.Numeric(), nullable=True),
    )

    op.create_table(
        "project_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("x_mm", sa.Numeric(), nullable=False),
        sa.Column("y_mm", sa.Numeric(), nullable=False),
        sa.Column("rotation_deg", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
    )

    op.create_table(
        "copper_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True),
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
    )

    op.create_table(
        "busbars",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("part_no", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("busbar_type", sa.Text(), nullable=False),
        sa.Column("phase", sa.Text(), nullable=False),
        sa.Column("connected_device_label", sa.Text(), nullable=True),
        sa.Column("width_mm", sa.Numeric(), nullable=False),
        sa.Column("thickness_mm", sa.Numeric(), nullable=False),
        sa.Column("material", sa.Text(), server_default="Cu", nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("cut_length_mm", sa.Numeric(), nullable=False),
    )

    op.create_table(
        "busbar_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("busbar_id", sa.Integer(), sa.ForeignKey("busbars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("start_x_mm", sa.Numeric(), nullable=False),
        sa.Column("start_y_mm", sa.Numeric(), nullable=False),
        sa.Column("end_x_mm", sa.Numeric(), nullable=False),
        sa.Column("end_y_mm", sa.Numeric(), nullable=False),
    )

    op.create_table(
        "busbar_holes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("busbar_id", sa.Integer(), sa.ForeignKey("busbars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hole_no", sa.Integer(), nullable=False),
        sa.Column("x_mm", sa.Numeric(), nullable=False),
        sa.Column("y_mm", sa.Numeric(), nullable=False),
        sa.Column("diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("slot_width_mm", sa.Numeric(), nullable=True),
        sa.Column("slot_length_mm", sa.Numeric(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
    )

    op.create_table(
        "busbar_bends",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("busbar_id", sa.Integer(), sa.ForeignKey("busbars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bend_no", sa.Integer(), nullable=False),
        sa.Column("distance_from_start_mm", sa.Numeric(), nullable=False),
        sa.Column("angle_deg", sa.Numeric(), nullable=False),
        sa.Column("direction", sa.Text(), nullable=False),
        sa.Column("inner_radius_mm", sa.Numeric(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("busbar_bends")
    op.drop_table("busbar_holes")
    op.drop_table("busbar_segments")
    op.drop_table("busbars")
    op.drop_table("copper_settings")
    op.drop_table("project_devices")
    op.drop_table("device_terminals")
    op.drop_table("panels")
    op.drop_table("devices")
    op.drop_table("projects")
