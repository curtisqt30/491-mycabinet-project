from __future__ import annotations

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    provider: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
    provider_id: Mapped[str | None] = mapped_column(String(128), index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255))
    onboarding_complete: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    # Relationships
    pantry_ingredients: Mapped[list[UserIngredient]] = relationship(
        "UserIngredient", back_populates="user", cascade="all, delete-orphan"
    )


# Import after User class to avoid circular import
from app.models.link_tables import UserIngredient  # noqa: E402