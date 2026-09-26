import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "cv_screening.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered CV Screening System"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    STORAGE_DIR: str = os.path.join(BASE_DIR, "storage")
    
    # Cấu hình Whitelist CORS (khóa chặn origin tùy tiện)
    ALLOWED_ORIGINS: List[str] = [
        "https://duy-tcv.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Cấu hình Supabase Auth & JWT Verification
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://nalriiuaglaefulqqbrb.supabase.co")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_7HPxZQMtgG0bxfyIZkddqA_IRhAGKXp")
    ENABLE_BACKEND_AUTH: bool = os.getenv("ENABLE_BACKEND_AUTH", "true").lower() in ("true", "1", "yes")

    # Cấu hình máy chủ gửi Email SMTP (Gmail / Outlook / Custom SMTP) - Không hardcode secret
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Ban Tuyển dụng Nhân sự")

    # Cấu hình gửi Email qua HTTPS API / Webhook (vượt qua firewall chặn SMTP của Cloud)
    EMAIL_WEBHOOK_URL: str = os.getenv("EMAIL_WEBHOOK_URL", "")
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
