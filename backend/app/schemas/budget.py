from __future__ import annotations

from pydantic import BaseModel, Field


class BudgetBase(BaseModel):
    # Month in YYYY-MM format (ex:"2025-12")
    month: str = Field(..., min_length=7, max_length=7, examples=["2025-12"])
    total_amount: float = Field(..., gt=0, examples=[100.0])


class BudgetCreate(BudgetBase):
    """
    Request body for creating/updating a monthly budget.
    """
    pass


class BudgetRead(BudgetBase):
    """
    Response model for returning budget info.
    total_spent or remaining can be filled in later when expenditure tracking is implemented)
    """
    id: int
    total_spent: float = Field(0.0, examples=[25.0])
    remaining: float = Field(0.0, examples=[75.0])

    class Config:
        from_attributes = True
