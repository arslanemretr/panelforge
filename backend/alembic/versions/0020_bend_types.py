"""bend_types, bend_parameters, bend_segments tables

Revision ID: 0020_bend_types
Revises: 0019_terminal_definitions
Create Date: 2026-05-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0020_bend_types"
down_revision = "0019_terminal_definitions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── bend_types ────────────────────────────────────────────────────────────
    op.create_table(
        "bend_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("template_type", sa.Text(), nullable=False, server_default="Özel"),
        sa.Column("thickness_mm", sa.Numeric(), nullable=False, server_default="5"),
        sa.Column("parallel_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("start_direction", sa.Text(), nullable=False, server_default="up"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    # ── bend_parameters ───────────────────────────────────────────────────────
    op.create_table(
        "bend_parameters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bend_type_id", sa.Integer(),
                  sa.ForeignKey("bend_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("default_value", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("formula", sa.Text(), nullable=True),
        sa.Column("is_calculated", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ── bend_segments ─────────────────────────────────────────────────────────
    op.create_table(
        "bend_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bend_type_id", sa.Integer(),
                  sa.ForeignKey("bend_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("length_expr", sa.Text(), nullable=False),
        sa.Column("angle_from_prev", sa.Numeric(), nullable=False, server_default="0"),
    )

    # ── Seed: 4 şablon ────────────────────────────────────────────────────────
    # 1) Z Büküm
    op.execute("""
        INSERT INTO bend_types (name, description, template_type, thickness_mm, parallel_count, start_direction)
        VALUES ('Z Büküm', 'İki bükümlü Z profili — cihaz terminalinden ana baraya dikey-yatay-dikey bağlantı', 'Z', 5, 1, 'up')
    """)
    op.execute("""
        INSERT INTO bend_parameters (bend_type_id, order_no, name, label, default_value, formula, is_calculated)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 1, 'A1', 'Alt Ayak Uzunluğu (mm)', 100, NULL, false),
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 2, 'B',  'Yatay Mesafe (mm)',       60,  NULL, false),
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 3, 'A2', 'Üst Ayak Uzunluğu (mm)', 80,  NULL, false),
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 4, 'TH', 'Toplam Yükseklik (mm)',   0,  'A1+A2', true)
    """)
    op.execute("""
        INSERT INTO bend_segments (bend_type_id, order_no, label, length_expr, angle_from_prev)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 1, 'A1 Kolu',    'A1', 0),
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 2, 'Yatay B',    'B',  90),
          ((SELECT id FROM bend_types WHERE name='Z Büküm'), 3, 'A2 Kolu',    'A2', -90)
    """)

    # 2) ZL Büküm
    op.execute("""
        INSERT INTO bend_types (name, description, template_type, thickness_mm, parallel_count, start_direction)
        VALUES ('ZL Büküm', 'Üç bükümlü ZL profili — alt yatay ayak + Z büküm kombinasyonu', 'ZL', 5, 1, 'right')
    """)
    op.execute("""
        INSERT INTO bend_parameters (bend_type_id, order_no, name, label, default_value, formula, is_calculated)
        VALUES
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 1, 'C',  'Alt Yatay Ayak (mm)',    40,  NULL, false),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 2, 'A1', 'Dikey Kol 1 (mm)',       100, NULL, false),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 3, 'B',  'Yatay Mesafe (mm)',       60,  NULL, false),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 4, 'A2', 'Dikey Kol 2 (mm)',        80,  NULL, false),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 5, 'TH', 'Toplam Yükseklik (mm)',   0,  'A1+A2', true)
    """)
    op.execute("""
        INSERT INTO bend_segments (bend_type_id, order_no, label, length_expr, angle_from_prev)
        VALUES
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 1, 'C Ayak',    'C',  0),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 2, 'A1 Kolu',   'A1', 90),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 3, 'Yatay B',   'B',  90),
          ((SELECT id FROM bend_types WHERE name='ZL Büküm'), 4, 'A2 Kolu',   'A2', -90)
    """)

    # 3) Tip-1
    op.execute("""
        INSERT INTO bend_types (name, description, template_type, thickness_mm, parallel_count, start_direction)
        VALUES ('Tip-1', 'İki bükümlü standart bağlantı — TH = A1 + A2', 'Tip-1', 5, 1, 'up')
    """)
    op.execute("""
        INSERT INTO bend_parameters (bend_type_id, order_no, name, label, default_value, formula, is_calculated)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 1, 'A1', 'Alt Kol (mm)',             80,  NULL,    false),
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 2, 'B',  'Yatay Offset (mm)',         50,  NULL,    false),
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 3, 'A2', 'Üst Kol (mm)',              60,  NULL,    false),
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 4, 'TH', 'Toplam Yükseklik (mm)',      0,  'A1+A2', true)
    """)
    op.execute("""
        INSERT INTO bend_segments (bend_type_id, order_no, label, length_expr, angle_from_prev)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 1, 'A1 Kolu',  'A1', 0),
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 2, 'B Offset',  'B',  90),
          ((SELECT id FROM bend_types WHERE name='Tip-1'), 3, 'A2 Kolu',  'A2', -90)
    """)

    # 4) Tip-2
    op.execute("""
        INSERT INTO bend_types (name, description, template_type, thickness_mm, parallel_count, start_direction)
        VALUES ('Tip-2', 'İki bükümlü — üst ek offset ile, TH = A1 + A2 + 25', 'Tip-2', 5, 1, 'up')
    """)
    op.execute("""
        INSERT INTO bend_parameters (bend_type_id, order_no, name, label, default_value, formula, is_calculated)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 1, 'A1', 'Alt Kol (mm)',             80,  NULL,       false),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 2, 'B',  'Yatay Offset (mm)',         50,  NULL,       false),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 3, 'A2', 'Üst Kol (mm)',              60,  NULL,       false),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 4, 'D',  'Ek Uzunluk (mm)',           25,  NULL,       false),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 5, 'TH', 'Toplam Yükseklik (mm)',      0,  'A1+A2+D',  true)
    """)
    op.execute("""
        INSERT INTO bend_segments (bend_type_id, order_no, label, length_expr, angle_from_prev)
        VALUES
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 1, 'A1 Kolu',  'A1', 0),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 2, 'B Offset',  'B',  90),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 3, 'A2 Kolu',  'A2', -90),
          ((SELECT id FROM bend_types WHERE name='Tip-2'), 4, 'D Uzantı', 'D',   0)
    """)


def downgrade() -> None:
    op.drop_table("bend_segments")
    op.drop_table("bend_parameters")
    op.drop_table("bend_types")
