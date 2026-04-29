"""project panels

Revision ID: 0004_project_panels
Revises: 0003_k_factor_and_busbar_offsets
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_project_panels"
down_revision = "0003_k_factor_and_busbar_offsets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_panels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panel_definition_id", sa.Integer(), sa.ForeignKey("panel_definitions.id"), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("seq", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_table("project_panels")
