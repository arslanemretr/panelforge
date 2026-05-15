"""phase_labels and phase_types tables; copper_definitions.phase_type → FK

Revision ID: 0022_phase_labels_and_types
Revises: 0021_branch_conductors
Create Date: 2026-05-15
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0022_phase_labels_and_types"
down_revision = "0021_branch_conductors"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. phase_labels tablosu ──────────────────────────────────────────────
    op.create_table(
        "phase_labels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.Text(), nullable=False, unique=True),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.execute("""
        INSERT INTO phase_labels (label, color, is_system) VALUES
        ('L1',  '#e74c3c', true),
        ('L2',  '#f1c40f', true),
        ('L3',  '#3498db', true),
        ('N',   '#95a5a6', true),
        ('PE',  '#27ae60', true),
        ('PEN', '#2ecc71', true),
        ('+',   '#e67e22', true),
        ('-',   '#9b59b6', true)
    """)

    # ── 2. phase_types tablosu ───────────────────────────────────────────────
    op.create_table(
        "phase_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("phases", sa.Text(), nullable=False),
    )
    op.execute("""
        INSERT INTO phase_types (name, phases) VALUES
        ('3 Fazlı',                    'L1,L2,L3'),
        ('3 Fazlı + Nötr (N sonda)',   'L1,L2,L3,N'),
        ('3 Fazlı + Nötr (N önde)',    'N,L1,L2,L3'),
        ('Tek Fazlı',                  'L1'),
        ('Tek Fazlı + Nötr',           'L1,N'),
        ('İki Fazlı',                  'L1,L2'),
        ('İki Fazlı + Nötr',           'L1,L2,N'),
        ('DC Bipolar',                 '+,-')
    """)

    # ── 3. copper_definitions → phase_type_id FK kolonu ─────────────────────
    op.add_column(
        "copper_definitions",
        sa.Column(
            "phase_type_id",
            sa.Integer(),
            sa.ForeignKey("phase_types.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # ── 4. Mevcut string değerleri yeni FK'ya taşı ───────────────────────────
    op.execute("""
        UPDATE copper_definitions
        SET phase_type_id = (SELECT id FROM phase_types WHERE phases = 'L1,L2,L3')
        WHERE phase_type = 'L1-L2-L3' OR phase_type IS NULL
    """)
    op.execute("""
        UPDATE copper_definitions
        SET phase_type_id = (SELECT id FROM phase_types WHERE phases = 'N,L1,L2,L3')
        WHERE phase_type = 'N-L1-L2-L3'
    """)
    op.execute("""
        UPDATE copper_definitions
        SET phase_type_id = (SELECT id FROM phase_types WHERE phases = 'L1,L2,L3,N')
        WHERE phase_type = 'L1-L2-L3-N'
    """)

    # ── 5. Eski phase_type TEXT kolonu sil ───────────────────────────────────
    op.drop_column("copper_definitions", "phase_type")


def downgrade() -> None:
    op.add_column(
        "copper_definitions",
        sa.Column("phase_type", sa.Text(), nullable=True),
    )
    op.execute("""
        UPDATE copper_definitions cd
        SET phase_type = pt.phases
        FROM phase_types pt
        WHERE cd.phase_type_id = pt.id
    """)
    op.drop_column("copper_definitions", "phase_type_id")
    op.drop_table("phase_types")
    op.drop_table("phase_labels")
