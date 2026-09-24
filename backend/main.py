import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router

# Import tất cả các model để SQLAlchemy đăng ký đầy đủ các bảng DB
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.audit_log import AuditLog
from app.models.candidate_pdf import CandidatePDF

# Tự động tạo bảng DB nếu chưa có
Base.metadata.create_all(bind=engine)

# Tự động đồng bộ các cột mới vào PostgreSQL / SQLite nếu bảng đã tồn tại
def run_auto_migrations():
    columns_to_add = [
        ("candidates", "email", "VARCHAR"),
        ("candidates", "phone", "VARCHAR"),
        ("candidates", "approval_status", "VARCHAR DEFAULT 'PENDING'"),
        ("candidates", "rejection_reason", "TEXT"),
        ("candidates", "interview_type", "VARCHAR"),
        ("candidates", "interview_time", "VARCHAR"),
        ("candidates", "interview_location", "VARCHAR"),
        ("candidates", "reviewed_by", "VARCHAR"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                conn.commit()
            except Exception as e:
                print(f"Auto-migration note for {table}.{col}: {e}")

try:
    run_auto_migrations()
except Exception as e:
    print(f"Auto-migration warning: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# Cấu hình CORS cho phép Frontend kết nối từ mọi nguồn (Vercel, Localhost, Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "AI-Powered CV Screening System API is running successfully!",
        "docs": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0",
        "status": "healthy"
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
