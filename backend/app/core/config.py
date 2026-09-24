import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "cv_screening.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered CV Screening System"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    GEMINI_API_KEY: str = ""
    STORAGE_DIR: str = os.path.join(BASE_DIR, "storage")
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
