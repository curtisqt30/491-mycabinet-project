from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, hash_password, verify_password
from app.models.user import User
from app.schemas.otp import OTPVerifyIn, ResetCompleteIn
from app.services import mail_services, token_service

log = getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth:account"])

PURPOSE_MAP = {
    "verify": "verify_otp",
    "reset": "reset_otp",
    "delete": "delete_otp",
}


# Pydantic model for direct password change (with current password)
class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/password/change")
def change_password_verified(
    data: ResetCompleteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change password for authenticated user after OTP verification.
    Uses the 'verify' intent OTP to confirm the action.
    """
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP["verify"]

    # Ensure the email matches the current user
    if email != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email does not match authenticated user",
        )

    # Verify the OTP
    if not token_service.verify_otp(db, email=email, purpose=purpose, otp=data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )

    # Update the password
    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    db.commit()

    # Send confirmation email
    try:
        mail_services.send_password_changed_notice(email)
    except Exception:
        log.exception("Failed to send password change notice to %s", email)

    return {"ok": True, "message": "Password updated successfully"}


@router.delete("/account")
def delete_account(
    data: OTPVerifyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete user account after OTP verification.
    Uses the 'delete' intent OTP to confirm the action.
    """
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP["delete"]

    # Ensure the email matches the current user
    if email != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email does not match authenticated user",
        )

    # Verify the OTP
    if not token_service.verify_otp(db, email=email, purpose=purpose, otp=data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )

    # Delete the user
    db.delete(current_user)
    db.commit()

    # send a goodbye email
    try:
        mail_services.send_account_deleted_notice(email)
    except Exception:
        log.exception("Failed to send account deletion notice to %s", email)

    return {"ok": True, "message": "Account deleted successfully"}


@router.post("/password/change-with-current")
def change_password_with_current(
    data: ChangePasswordIn,  # <-- Now uses Pydantic model for JSON body
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change password using current password (no OTP required).
    This is for the traditional password change flow.
    """
    # Verify current password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account uses OAuth, cannot change password",
        )

    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Update the password
    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    db.commit()

    # Send confirmation email
    try:
        mail_services.send_password_changed_notice(current_user.email)
    except Exception:
        log.exception("Failed to send password change notice to %s", current_user.email)

    return {"ok": True, "message": "Password updated successfully"}