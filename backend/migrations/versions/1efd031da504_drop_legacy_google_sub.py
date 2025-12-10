"""
Template for creating new database migration files

When you run: alembic revision --autogenerate -m "add new table"
Alembic uses this template to create a new migration file.

drop_legacy_google_sub

Revision ID: 1efd031da504
Revises: f98de7c816d2
Create Date: 2025-12-10 22:07:58.762105+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
# These are like version numbers for your database changes
revision = '1efd031da504'
down_revision = 'f98de7c816d2'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in the table."""
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [col['name'] for col in insp.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Drop legacy google_sub column if it exists."""
    if column_exists('users', 'google_sub'):
        op.drop_column('users', 'google_sub')


def downgrade() -> None:
    """Re-add google_sub column."""
    if not column_exists('users', 'google_sub'):
        op.add_column('users', sa.Column('google_sub', sa.String(255), nullable=True))