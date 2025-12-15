from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.budget import Budget


def get_budget_by_user_and_month(
    db: Session, *, user_id: int, month: str
) -> Optional[Budget]:
    """
    Return the budget row for this user + month, or None if it doesn't exist.
    """
    stmt = select(Budget).where(
        Budget.user_id == user_id,
        Budget.month == month,
    )
    result = db.execute(stmt).scalar_one_or_none()
    return result


def create_budget(
    db: Session, *, user_id: int, month: str, total_amount: float
) -> Budget:
    """
    Create a new budget row for this user + month.
    """
    budget = Budget(
        user_id=user_id,
        month=month,
        total_amount=total_amount,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def set_or_update_budget(
    db: Session, *, user_id: int, month: str, total_amount: float
) -> Budget:
    """
    If a budget already exists for (user, month), update it.
    Otherwise, create a new one.
    """
    budget = get_budget_by_user_and_month(db, user_id=user_id, month=month)

    if budget is None:
        budget = create_budget(
            db,
            user_id=user_id,
            month=month,
            total_amount=total_amount,
        )
    else:
        budget.total_amount = total_amount
        db.commit()
        db.refresh(budget)

    return budget
