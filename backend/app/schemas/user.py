from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

from ..services.password_policy import MIN_LEN, validate_password


# Pydantic schema for user output
class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    provider: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_LEN)

    @field_validator("password")
    @classmethod
    def apply_policy(cls, v: str, info: ValidationInfo):
        email_val = None
        if info is not None and isinstance(info.data, dict):
            email_val = info.data.get("email")

        errs = validate_password(v, str(email_val) if email_val else None)
        if errs:
            raise ValueError("; ".join(errs))
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    display_name: str | None = None
    onboarding_complete: bool = False

    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
