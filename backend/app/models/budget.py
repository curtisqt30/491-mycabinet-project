from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Month in "YYYY-MM" ("2025-12")
    month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)

    total_amount: Mapped[float] = mapped_column(Float, nullable=False)

    user = relationship("User", back_populates="budgets")
