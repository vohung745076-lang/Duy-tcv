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

    # Cấu hình máy chủ gửi Email SMTP (Gmail / Outlook / Custom SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "vohung745076@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "yxcf oujo djgy vydt")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Ban Tuyển dụng Nhân sự")

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
