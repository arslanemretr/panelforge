"""project_coppers table

Revision ID: 0005_project_coppers
Revises: 0004_project_panels
Create Date: 2026-04-29
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_project_coppers"
down_revision = "0004_project_panels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_coppers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "copper_definition_id",
            sa.Integer(),
            sa.ForeignKey("copper_definitions.id"),
            nullable=False,
        ),
        sa.Column("length_mm", sa.Numeric(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("seq", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_table("project_coppers")
