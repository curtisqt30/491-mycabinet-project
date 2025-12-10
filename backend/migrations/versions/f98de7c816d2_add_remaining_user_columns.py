"""
Template for creating new database migration files

When you run: alembic revision --autogenerate -m "add new table"
Alembic uses this template to create a new migration file.

add_remaining_user_columns

Revision ID: f98de7c816d2
Revises: 45572dc615e5
Create Date: 2025-12-10 22:05:46.741438+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
# These are like version numbers for your database changes
revision = 'f98de7c816d2'
down_revision = '45572dc615e5'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in the table."""
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [col['name'] for col in insp.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add remaining columns to users table (idempotent)."""
    if not column_exists('users', 'hashed_password'):
        op.add_column('users', sa.Column('hashed_password', sa.String(255), nullable=True))
    
    if not column_exists('users', 'onboarding_complete'):
        op.add_column('users', sa.Column('onboarding_complete', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Remove columns from users table."""
    if column_exists('users', 'onboarding_complete'):
        op.drop_column('users', 'onboarding_complete')
    if column_exists('users', 'hashed_password'):
        op.drop_column('users', 'hashed_password')