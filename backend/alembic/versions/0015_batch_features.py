"""batch features: device timestamps, copper coating, phase center, panel quantity

Revision ID: 0015_batch_features
Revises: 0014_device_terminal_extended
Create Date: 2026-05-01

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import func

revision = "0015_batch_features"
down_revision = "0014_device_terminal_extended"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Device: zaman damgaları ──────────────────────────────────────────────
    op.add_column("devices", sa.Column(
        "created_at", sa.DateTime(), server_default=func.now(), nullable=False,
    ))
    op.add_column("devices", sa.Column(
        "updated_at", sa.DateTime(), server_default=func.now(), nullable=False,
    ))

    # ── CopperDefinition: kaplama tipi ──────────────────────────────────────
    op.add_column("copper_definitions", sa.Column("coating_type", sa.Text(), nullable=True))

    # ── CopperSettings: kaplama + faz merkez mesafesi ───────────────────────
    op.add_column("copper_settings", sa.Column("coating_type", sa.Text(), nullable=True))
    op.add_column("copper_settings", sa.Column("main_phase_center_mm",   sa.Numeric(), nullable=True))
    op.add_column("copper_settings", sa.Column("branch_phase_center_mm", sa.Numeric(), nullable=True))

    # ── ProjectPanel: adet ──────────────────────────────────────────────────
    op.add_column("project_panels", sa.Column(
        "quantity", sa.Integer(), nullable=False, server_default="1",
    ))


def downgrade() -> None:
    op.drop_column("project_panels", "quantity")
    op.drop_column("copper_settings", "branch_phase_center_mm")
    op.drop_column("copper_settings", "main_phase_center_mm")
    op.drop_column("copper_settings", "coating_type")
    op.drop_column("copper_definitions", "coating_type")
    op.drop_column("devices", "updated_at")
    op.drop_column("devices", "created_at")
