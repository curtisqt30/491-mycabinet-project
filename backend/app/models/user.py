from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str | None] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
    provider_id: Mapped[str | None] = mapped_column(String(128), index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255))

    # Relationships
    pantry_ingredients: Mapped[list[UserIngredient]] = relationship(
        "UserIngredient", back_populates="user", cascade="all, delete-orphan"
    )

    budgets: Mapped[list[Budget]] = relationship(
        "Budget", back_populates="user", cascade="all, delete-orphan"
    )


# Import after User class to avoid circular import
from app.models.link_tables import UserIngredient  # noqa: E402

from app.models.budget import Budget  # noqa: E402
