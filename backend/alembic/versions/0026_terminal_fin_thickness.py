"""terminal fin thickness field

Revision ID: 0026_terminal_fin_thickness
Revises: 0025_terminal_bolt_position
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0026_terminal_fin_thickness"
down_revision = "0025_terminal_bolt_position"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "terminal_definitions",
        sa.Column("fin_thickness_mm", sa.Numeric(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("terminal_definitions", "fin_thickness_mm")
