import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Đảm bảo thư mục storage và DB tồn tại
storage_uploads = os.path.join(settings.STORAGE_DIR, "uploads")
storage_processed = os.path.join(settings.STORAGE_DIR, "processed")
os.makedirs(storage_uploads, exist_ok=True)
os.makedirs(storage_processed, exist_ok=True)

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
