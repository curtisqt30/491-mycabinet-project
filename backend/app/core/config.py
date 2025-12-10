import os


class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-prod")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Database URL handling for Railway
    _db_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif _db_url.startswith("postgresql://") and "+psycopg" not in _db_url:
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    DATABASE_URL = _db_url
    
    CORS_ORIGINS = [
        s.strip()
        for s in os.getenv(
            "CORS_ORIGINS", "http://localhost:19006,http://localhost:5173"
        ).split(",")
    ]


settings = Settings()