"""Remove conversation, message, and profile persistence.

Revision ID: 20261027131500
Revises: 20261027130000
"""

from alembic import op
import sqlalchemy as sa


revision = "20261027131500"
down_revision = "20261027130000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # Drop only if the legacy tables still exist (idempotent for already-cleaned DBs)
    for table in ("user_profiles", "messages", "conversations"):
        if table in existing_tables:
            op.drop_table(table)


def downgrade() -> None:
    raise NotImplementedError("The removed persistence tables are not restored by downgrade.")
