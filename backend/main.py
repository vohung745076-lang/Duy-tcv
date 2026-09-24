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
        ("candidates", "job_title", "VARCHAR"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in columns_to_add:
            try:
                # Kiểm tra xem cột đã tồn tại chưa bằng PRAGMA table_info (đặc thù của SQLite)
                result = conn.execute(text(f"PRAGMA table_info({table});"))
                existing_columns = [row[1] for row in result.fetchall()]
                
                if col not in existing_columns:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                    conn.commit()
                    print(f"Auto-migration: Added column {col} to {table}")
            except Exception as e:
                print(f"Auto-migration note for {table}.{col}: {e}")

        # Đồng bộ snapshot job_title cho các ứng viên cũ
        try:
            conn.execute(text("""
                UPDATE candidates 
                SET job_title = (SELECT title FROM job_descriptions WHERE job_descriptions.id = candidates.job_id)
                WHERE (job_title IS NULL OR job_title = '') AND job_id IS NOT NULL;
            """))
            conn.commit()
        except Exception as e:
            print(f"Auto-migration snapshot note: {e}")

        # Kiểm tra bảng evaluations để đảm bảo job_id là NULLABLE (tránh lỗi SQLite NOT NULL khi xóa Job)
        try:
            result = conn.execute(text("PRAGMA table_info(evaluations);")).fetchall()
            job_id_col = next((r for r in result if r[1] == 'job_id'), None)
            if job_id_col and job_id_col[3] == 1:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS evaluations_temp (
                        id VARCHAR NOT NULL PRIMARY KEY,
                        candidate_id VARCHAR NOT NULL,
                        job_id VARCHAR,
                        overall_score FLOAT NOT NULL,
                        skills_score FLOAT NOT NULL,
                        experience_score FLOAT NOT NULL,
                        education_score FLOAT NOT NULL,
                        breakdown JSON,
                        interview_questions JSON,
                        ai_summary TEXT,
                        hr_override_score FLOAT,
                        hr_override_reason TEXT,
                        evaluation_status VARCHAR,
                        created_at DATETIME,
                        updated_at DATETIME,
                        FOREIGN KEY(candidate_id) REFERENCES candidates (id),
                        FOREIGN KEY(job_id) REFERENCES job_descriptions (id)
                    );
                """))
                conn.execute(text("""
                    INSERT INTO evaluations_temp 
                    SELECT id, candidate_id, job_id, overall_score, skills_score, experience_score, education_score, breakdown, interview_questions, ai_summary, hr_override_score, hr_override_reason, evaluation_status, created_at, updated_at 
                    FROM evaluations;
                """))
                conn.execute(text("DROP TABLE evaluations;"))
                conn.execute(text("ALTER TABLE evaluations_temp RENAME TO evaluations;"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_evaluations_candidate_id ON evaluations (candidate_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_evaluations_job_id ON evaluations (job_id);"))
                conn.commit()
                print("Auto-migration: evaluations.job_id is now nullable.")
        except Exception as e:
            print(f"Auto-migration evaluations nullability note: {e}")

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
