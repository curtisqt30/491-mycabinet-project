from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.budget import BudgetCreate, BudgetRead
from app.services.budget_service import get_budget_by_user_and_month, set_or_update_budget

from app.core.db import get_db
from app.core.security import get_current_user


router = APIRouter(prefix="/budget", tags=["budget"])


def _current_month_str() -> str:
    return datetime.now().strftime("%Y-%m")


@router.post("", response_model=BudgetRead, status_code=status.HTTP_200_OK)
def upsert_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> BudgetRead:
    """
    Create or update a monthly budget for the authenticated user.
    """
    budget = set_or_update_budget(
        db,
        user_id=current_user.id,
        month=budget_in.month,
        total_amount=budget_in.total_amount,
    )

    # Placeholder until your partner wires transactions:
    total_spent = 0.0
    remaining = budget.total_amount - total_spent

    return BudgetRead(
        id=budget.id,
        month=budget.month,
        total_amount=budget.total_amount,
        total_spent=total_spent,
        remaining=remaining,
    )


@router.get("/current", response_model=BudgetRead)
def get_current_budget(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> BudgetRead:
    """
    Get the budget for the given month (YYYY-MM). If month is not provided,
    defaults to the current month.
    """
    month_str = month or _current_month_str()

    budget = get_budget_by_user_and_month(db, user_id=current_user.id, month=month_str)
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget set for month {month_str}",
        )

    total_spent = 0.0  # placeholder
    remaining = budget.total_amount - total_spent

    return BudgetRead(
        id=budget.id,
        month=budget.month,
        total_amount=budget.total_amount,
        total_spent=total_spent,
        remaining=remaining,
    )
