from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import EmailStr
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.db import get_db
from app.models.user import User
from app.schemas.user import TokenPair, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

DbDep = Annotated[Session, Depends(get_db)]

# ---- Helpers -----


# Issue access and refresh tokens for a given user ID
def _issue_tokens(*, user_id: int) -> TokenPair:
    """Generate access and refresh tokens for a user."""
    access_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = security.create_access_token(
        data={"sub": str(user_id), "type": "access"},
        expires_delta=access_expires,
    )
    refresh_token = security.create_refresh_token(
        data={"sub": str(user_id), "type": "refresh"},
        expires_delta=refresh_expires,
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=int(access_expires.total_seconds()),
    )


# Find a user by email
def _find_user_by_email(db: Session, email: str) -> User | None:
    """Retrieve a user from the database by email."""
    return db.query(User).filter(User.email == email).first()


# ---- Routes -----


# Registration endpoint
@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: DbDep):
    """Create a new user and return auth tokens."""
    existing = _find_user_by_email(db, payload.email.lower())
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    hashed = security.hash_password(payload.password)
    user = User(email=payload.email.lower(), hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_tokens(user_id=user.id)


# Login endpoint
@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, db: DbDep):
    user = _find_user_by_email(db, payload.email.lower())
    if not user or not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _issue_tokens(user_id=user.id)


# Token refresh endpoint
@router.post("/refresh", response_model=TokenPair)
def refresh(token_pair: TokenPair):
    try:
        claims = security.decode_refresh_token(token_pair.refresh_token)
    except security.TokenError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user_id = int(claims.get("sub"))
    return _issue_tokens(user_id=user_id)


# Logout endpoint
@router.post("/logout", status_code=204)
def logout(_: DbDep, response: Response):
    response.status_code = status.HTTP_204_NO_CONTENT
    return


# Get current user endpoint
@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(security.get_current_user)]):
    """Get current user info including onboarding status."""
    # Use model_validate with from_attributes to get all fields from the ORM model
    return UserRead.model_validate(current_user)


# User existsence check endpoint
@router.get("/exists")
def email_exists(email: EmailStr = Query(...), db: Session = Depends(get_db)):
    e = email.strip().lower()
    exists = db.query(User.id).filter(User.email == e).first() is not None
    return {"exists": bool(exists)}