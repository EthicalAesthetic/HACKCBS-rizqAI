"""Allow local-auth pending signups without a Supabase user ID.

Revision ID: 20261027125000
Revises: 20261027124500
"""

from alembic import op
import sqlalchemy as sa


revision = "20261027125000"
down_revision = "20261027124500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite does not support ALTER COLUMN directly.
    # Use batch_alter_table which Alembic translates to a table-copy for SQLite.
    with op.batch_alter_table("pending_signups") as batch_op:
        batch_op.alter_column(
            "supabase_user_id",
            existing_type=sa.String(length=36),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("pending_signups") as batch_op:
        batch_op.alter_column(
            "supabase_user_id",
            existing_type=sa.String(length=36),
            nullable=False,
        )
