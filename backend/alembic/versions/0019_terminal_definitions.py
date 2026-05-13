"""terminal_definitions table and device reference_origin

Revision ID: 0019_terminal_definitions
Revises: 0018_copper_phase_layout
Create Date: 2026-05-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019_terminal_definitions"
down_revision = "0018_copper_phase_layout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── terminal_definitions tablosu ─────────────────────────────────────────
    op.create_table(
        "terminal_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("terminal_type", sa.Text(), nullable=False),
        sa.Column("surface", sa.Text(), nullable=False),
        sa.Column("bolt_type", sa.Text(), nullable=True),
        sa.Column("bolt_count", sa.Integer(), nullable=True),
        sa.Column("bolt_center_distance_mm", sa.Numeric(), nullable=True),
        sa.Column("hole_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("terminal_width_mm", sa.Numeric(), nullable=True),
        sa.Column("terminal_height_mm", sa.Numeric(), nullable=True),
        sa.Column("terminal_depth_mm", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    # Örnek terminal tipleri
    op.execute("""
        INSERT INTO terminal_definitions
            (name, terminal_type, surface, bolt_type, bolt_count, bolt_center_distance_mm, hole_diameter_mm,
             terminal_width_mm, terminal_height_mm, terminal_depth_mm)
        VALUES
            ('Standart Ön Terminal M10', 'Ön Bakır Basmalı', 'front', 'M10', 2, 20, 11, 60, 40, 30),
            ('Standart Ön Terminal M12', 'Ön Bakır Basmalı', 'front', 'M12', 2, 25, 13, 70, 50, 35),
            ('Arka Yatay Taraklı M10',  'Arka Yatay Taraklı', 'back', 'M10', 2, 20, 11, 80, 30, 20),
            ('Arka Yatay Taraklı M12',  'Arka Yatay Taraklı', 'back', 'M12', 2, 25, 13, 90, 35, 25),
            ('Yandan Taraklı M10',      'Yandan Taraklı',    'left', 'M10', 2, 20, 11, 30, 60, 20)
    """)

    # ── devices tablosuna reference_origin kolonu ─────────────────────────────
    op.add_column(
        "devices",
        sa.Column("reference_origin", sa.Text(), nullable=True),
    )

    # ── device_terminals tablosuna terminal_definition_id FK kolonu ───────────
    op.add_column(
        "device_terminals",
        sa.Column(
            "terminal_definition_id",
            sa.Integer(),
            sa.ForeignKey("terminal_definitions.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("device_terminals", "terminal_definition_id")
    op.drop_column("devices", "reference_origin")
    op.drop_table("terminal_definitions")
