from pydantic import BaseModel, Field


class ProfileSetup(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)
    full_name: str | None = Field(None, max_length=255)


class ProfileRead(BaseModel):
    id: int
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    full_name: str | None = None
    onboarding_complete: bool = False

    model_config = {"from_attributes": True}


class OnboardingStatus(BaseModel):
    onboarding_complete: bool
    needs_profile_setup: bool
