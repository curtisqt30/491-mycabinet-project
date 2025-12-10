"""
Template for creating new database migration files

When you run: alembic revision --autogenerate -m "add new table"
Alembic uses this template to create a new migration file.

add_user_profile_columns

Revision ID: 45572dc615e5
Revises: 3c7138bb847a
Create Date: 2025-12-10 21:53:44.977149+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
# These are like version numbers for your database changes
revision = '45572dc615e5'
down_revision = '3c7138bb847a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add profile columns to users table."""
    op.add_column('users', sa.Column('full_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('display_name', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('provider', sa.String(32), nullable=False, server_default='local'))
    op.add_column('users', sa.Column('provider_id', sa.String(128), nullable=True))
    op.create_index('ix_users_provider_id', 'users', ['provider_id'])


def downgrade() -> None:
    """Remove profile columns from users table."""
    op.drop_index('ix_users_provider_id', table_name='users')
    op.drop_column('users', 'provider_id')
    op.drop_column('users', 'provider')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'display_name')
    op.drop_column('users', 'full_name')