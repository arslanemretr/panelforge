"""terminal_role and terminal_group fields

Adds terminal_role (input|output) and terminal_group (line|load|bus|branch)
to device_terminals for explicit connection modelling.

Revision ID: 0011_terminal_role_group
Revises: 0010_copper_density
Create Date: 2026-05-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0011_terminal_role_group"
down_revision = "0010_copper_density"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "device_terminals",
        sa.Column("terminal_role", sa.Text(), nullable=True),   # input | output
    )
    op.add_column(
        "device_terminals",
        sa.Column("terminal_group", sa.Text(), nullable=True),  # line | load | bus | branch
    )


def downgrade() -> None:
    op.drop_column("device_terminals", "terminal_role")
    op.drop_column("device_terminals", "terminal_group")
