import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Đảm bảo thư mục storage và DB tồn tại
storage_uploads = os.path.join(settings.STORAGE_DIR, "uploads")
storage_processed = os.path.join(settings.STORAGE_DIR, "processed")
os.makedirs(storage_uploads, exist_ok=True)
os.makedirs(storage_processed, exist_ok=True)

db_url = settings.DATABASE_URL
# Tự động chuyển đổi postgres:// thành postgresql:// cho tương thích SQLAlchemy
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
engine_kwargs = {"pool_pre_ping": True} if "postgresql" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
