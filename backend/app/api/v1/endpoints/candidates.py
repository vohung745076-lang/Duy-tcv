import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateResponseSchema
from app.services.pdf_service import pdf_service
from app.services.pii_service import pii_service

router = APIRouter()

@router.post("/jobs/{job_id}/upload", response_model=List[CandidateResponseSchema], status_code=status.HTTP_201_CREATED)
async def upload_candidates(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Tải lên nhiều file PDF CV, bóc tách text và che mờ thông tin cá nhân (PII Masking)."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")

    # Đếm số ứng viên hiện tại để tạo bí danh Candidate #01, #02...
    current_count = db.query(Candidate).filter(Candidate.job_id == job_id).count()

    created_candidates = []
    job_storage_dir = os.path.join(settings.STORAGE_DIR, "uploads", job_id)
    os.makedirs(job_storage_dir, exist_ok=True)

    for idx, upload_file in enumerate(files):
        if not upload_file.filename.lower().endswith(".pdf"):
            continue

        candidate_number = current_count + idx + 1
        masked_name = f"Candidate #{candidate_number:02d}"

        # Save file PDF
        file_path = os.path.join(job_storage_dir, f"{candidate_number}_{upload_file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        # Extract text & PII Masking
        raw_text = ""
        masked_text = ""
        try:
            raw_text = pdf_service.extract_text(file_path)
            masked_text = pii_service.mask_text(raw_text)
        except Exception as e:
            raw_text = f"[Lỗi trích xuất PDF: {str(e)}]"
            masked_text = raw_text

        candidate = Candidate(
            job_id=job_id,
            original_filename=upload_file.filename,
            file_path=file_path,
            masked_name=masked_name,
            raw_text=raw_text,
            masked_text=masked_text,
            status="PARSED"
        )
        db.add(candidate)
        created_candidates.append(candidate)

    db.commit()
    for c in created_candidates:
        db.refresh(c)
        c.text_preview = c.masked_text[:200] if c.masked_text else ""

    return created_candidates

@router.get("/jobs/{job_id}", response_model=List[CandidateResponseSchema])
def list_candidates_by_job(job_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách các ứng viên theo Job ID."""
    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).order_by(Candidate.created_at.asc()).all()
    for c in candidates:
        c.text_preview = c.masked_text[:200] if c.masked_text else ""
    return candidates

@router.get("/{candidate_id}/pdf")
def get_candidate_pdf(candidate_id: str, db: Session = Depends(get_db)):
    """Stream file PDF CV gốc để hiển thị trên khung PDF Viewer trong Split-View."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not os.path.exists(candidate.file_path):
        raise HTTPException(status_code=404, detail="File PDF không tồn tại.")

    return FileResponse(
        path=candidate.file_path,
        media_type="application/pdf",
        filename=candidate.original_filename
    )
