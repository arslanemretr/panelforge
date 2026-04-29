"""add project_panel_id to project_devices

Revision ID: 0006_project_device_panel
Revises: 0005_project_coppers
Create Date: 2026-04-29
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_project_device_panel"
down_revision = "0005_project_coppers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_devices",
        sa.Column(
            "project_panel_id",
            sa.Integer(),
            sa.ForeignKey("project_panels.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("project_devices", "project_panel_id")
