import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-prod")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    CORS_ORIGINS = [
        s.strip()
        for s in os.getenv(
            "CORS_ORIGINS", "http://localhost:19006,http://localhost:5173"
        ).split(",")
    ]
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


settings = Settings()
