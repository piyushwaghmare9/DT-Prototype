from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Dynamically locate .env files regardless of whether execution starts from backend, root, or IDE
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILES = (
    str(BACKEND_DIR / ".env"),
    str(ROOT_DIR / ".env"),
    ".env",
)


class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "campusx"

    JWT_SECRET_KEY: str = "changethis-supersecret-key-atleast-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    APP_NAME: str = "CampusX"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_EMAIL_DOMAIN: Optional[str] = None  # e.g. "college.edu"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@campusx.local"

    # Only set to True for offline tests if requested; real app defaults to False
    USE_MOCK_DB: bool = False

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

