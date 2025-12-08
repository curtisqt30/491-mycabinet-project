from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.profile import (
    OnboardingStatus,
    ProfileRead,
    ProfileSetup,
    ProfileUpdate,
)

router = APIRouter(prefix="/profile", tags=["profile"])

DbDep = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=ProfileRead)
def get_my_profile(current_user: CurrentUser):
    """Get current user's profile."""
    return ProfileRead.model_validate(current_user)


@router.get("/onboarding-status", response_model=OnboardingStatus)
def get_onboarding_status(current_user: CurrentUser):
    """Check if user has completed onboarding."""
    return OnboardingStatus(
        onboarding_complete=current_user.onboarding_complete,
        needs_profile_setup=not current_user.onboarding_complete,
    )


@router.post("/setup", response_model=ProfileRead, status_code=status.HTTP_200_OK)
def complete_profile_setup(payload: ProfileSetup, db: DbDep, current_user: CurrentUser):
    """
    Complete initial profile setup during onboarding.
    Sets display_name, optional avatar, and marks onboarding as complete.
    """
    current_user.display_name = payload.display_name.strip()
    if payload.avatar_url:
        current_user.avatar_url = payload.avatar_url
    current_user.onboarding_complete = True

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return ProfileRead.model_validate(current_user)


@router.put("/me", response_model=ProfileRead)
def update_profile(payload: ProfileUpdate, db: DbDep, current_user: CurrentUser):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return ProfileRead.model_validate(current_user)


@router.post("/skip-onboarding", response_model=ProfileRead)
def skip_onboarding(db: DbDep, current_user: CurrentUser):
    """
    Allow user to skip onboarding (marks as complete without profile data).
    """
    current_user.onboarding_complete = True
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return ProfileRead.model_validate(current_user)
