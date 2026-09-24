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
    """Xóa vị trí tuyển dụng khỏi giao diện và bảo toàn 100% hồ sơ ứng viên."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")

    try:
        # 0. Đảm bảo toàn bộ ứng viên của vị trí này được lưu cứng tên vị trí (Snapshot)
        candidates_to_snapshot = db.query(Candidate).filter(Candidate.job_id == job_id).all()
        for cand in candidates_to_snapshot:
            if not cand.job_title:
                cand.job_title = job.title
        db.flush()

        # 1. Gỡ liên kết job_id trong bảng candidates (bảo toàn ứng viên & CV PDF)
        db.query(Candidate).filter(Candidate.job_id == job_id).update(
            {"job_id": None}, synchronize_session=False
        )

        # 2. Gỡ liên kết job_id trong bảng evaluations (bảo toàn đánh giá AI)
        db.query(Evaluation).filter(Evaluation.job_id == job_id).update(
            {"job_id": None}, synchronize_session=False
        )

        # 3. Xóa duy nhất bản ghi vị trí tuyển dụng (JD)
        db.delete(job)
        db.commit()
        return {"message": f"Đã xóa vị trí tuyển dụng \"{job.title}\" thành công. Toàn bộ hồ sơ ứng viên và kết quả chấm điểm được bảo toàn nguyên vẹn trong Kho tổng hợp.", "deleted_id": job_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vị trí tuyển dụng: {str(e)}")
