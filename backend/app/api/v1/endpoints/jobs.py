from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobDescription
from app.schemas.job import JobCreateSchema, JobResponseSchema

router = APIRouter()

@router.post("", response_model=JobResponseSchema, status_code=status.HTTP_201_CREATED)
def create_job(job_in: JobCreateSchema, db: Session = Depends(get_db)):
    """Tạo mới một vị trí tuyển dụng (JD) kèm bộ tiêu chuẩn chấm điểm."""
    job = JobDescription(
        title=job_in.title,
        department=job_in.department,
        description=job_in.description,
        criteria=job_in.criteria.model_dump(),
        status="OPEN"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.get("", response_model=List[JobResponseSchema])
def list_jobs(db: Session = Depends(get_db)):
    """Lấy danh sách các vị trí tuyển dụng."""
    return db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()

@router.get("/{job_id}", response_model=JobResponseSchema)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Chi tiết một vị trí tuyển dụng theo ID."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")
    return job
