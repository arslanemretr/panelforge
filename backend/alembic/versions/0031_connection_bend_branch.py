"""connection_bend_branch

Revision ID: 0031_connection_bend_branch
Revises: 0030_project_copper_geometry
Create Date: 2026-05-18

Her DeviceConnection kaydına büküm tipi ve tali bakır tanımı referansı ekler.
"""

from alembic import op
import sqlalchemy as sa

revision = "0031_connection_bend_branch"
down_revision = "0030_project_copper_geometry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "device_connections",
        sa.Column(
            "bend_type_id",
            sa.Integer(),
            sa.ForeignKey("bend_types.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "device_connections",
        sa.Column(
            "branch_conductor_id",
            sa.Integer(),
            sa.ForeignKey("branch_conductors.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("device_connections", "branch_conductor_id")
    op.drop_column("device_connections", "bend_type_id")
