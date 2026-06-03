"""users

Revision ID: 0036_users
Revises: 0035_client_project_dates
Create Date: 2026-06-02

Kullanıcı tablosunu oluşturur ve ilk admin kullanıcısını seed eder.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = "0036_users"
down_revision = "0035_client_project_dates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False, server_default="engineer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # İlk admin kullanıcıyı seed et
    # Şifre hash'i runtime'da değişken bağımlılığı olmaması için
    # basit bir bcrypt hash kullanıyoruz (changeme123)
    # Gerçek ortamda FIRST_ADMIN_PASSWORD env'den alınır; migration sonrası değiştirilmeli.
    import os
    try:
        from passlib.context import CryptContext
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
        admin_email    = os.environ.get("FIRST_ADMIN_EMAIL", "admin@panelforge.com")
        admin_password = os.environ.get("FIRST_ADMIN_PASSWORD", "changeme123")
        hashed = pwd.hash(admin_password)
    except Exception:
        # passlib henüz yüklü değilse sabit hash kullan (changeme123)
        hashed = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXig/pOoqhOC"
        admin_email = "admin@panelforge.com"

    users_table = table(
        "users",
        column("email", sa.Text()),
        column("full_name", sa.Text()),
        column("hashed_password", sa.Text()),
        column("role", sa.Text()),
        column("is_active", sa.Boolean()),
    )
    op.bulk_insert(users_table, [
        {
            "email": admin_email,
            "full_name": "Admin",
            "hashed_password": hashed,
            "role": "admin",
            "is_active": True,
        }
    ])


def downgrade() -> None:
    op.drop_table("users")
