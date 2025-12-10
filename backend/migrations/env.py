from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

# make sure Alembic can import app.* modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# load .env file from backend/
load_dotenv()

# --- Build database URL ---
# Priority: DATABASE_URL env var (Railway), otherwise build from PG* vars (local dev)
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Railway/production: use DATABASE_URL directly
    # Fix postgres:// -> postgresql+psycopg:// for SQLAlchemy 2.0+
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
else:
    # Local dev: build from individual PG* environment variables
    from sqlalchemy.engine import URL
    database_url = URL.create(
        "postgresql+psycopg",
        username=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD"),
        host=os.getenv("PGHOST"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGDATABASE"),
        query={"sslmode": os.getenv("PGSSLMODE", "require")},
    )

# Interpret config file for logging
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models + metadata
from app.models.base import Base
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=str(database_url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(database_url, poolclass=pool.NullPool, future=True)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()