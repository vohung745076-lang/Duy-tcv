from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.candidate_pdf import CandidatePDF
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

@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    """Xóa một vị trí tuyển dụng và toàn bộ ứng viên, đánh giá liên quan."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")

    # 1. Xóa các bản ghi đánh giá (evaluations)
    db.query(Evaluation).filter(Evaluation.job_id == job_id).delete(synchronize_session=False)

    # 2. Xóa các ứng viên (candidates) và các file PDF của họ (candidate_pdfs)
    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).all()
    candidate_ids = [c.id for c in candidates]
    if candidate_ids:
        db.query(CandidatePDF).filter(CandidatePDF.candidate_id.in_(candidate_ids)).delete(synchronize_session=False)
        db.query(Candidate).filter(Candidate.id.in_(candidate_ids)).delete(synchronize_session=False)

    # 3. Xóa vị trí tuyển dụng
    db.delete(job)
    db.commit()
    return {"message": "Đã xóa vị trí tuyển dụng thành công.", "deleted_id": job_id}
