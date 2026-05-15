"""terminal bolt position fields

Revision ID: 0025_terminal_bolt_position
Revises: 0024_terminal_fin_fields
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0025_terminal_bolt_position"
down_revision = "0024_terminal_fin_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("bolt_pos_x_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "terminal_definitions",
        sa.Column("bolt_pos_y_mm", sa.Numeric(), nullable=True),
    )
    op.add_column(
        "terminal_definitions",
        sa.Column("bolt_pos_z_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "bolt_pos_z_mm")
    op.drop_column("terminal_definitions", "bolt_pos_y_mm")
    op.drop_column("terminal_definitions", "bolt_pos_x_mm")
