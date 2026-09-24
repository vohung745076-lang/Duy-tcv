import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateResponseSchema
from app.services.pdf_service import pdf_service
from app.services.pii_service import pii_service
from app.services.storage_service import storage_service

router = APIRouter()


def resolve_candidate_file_path(file_path: str) -> str | None:
    if file_path and os.path.exists(file_path):
        return file_path

    if file_path and not os.path.isabs(file_path):
        legacy_path = os.path.normpath(
            os.path.join(os.path.dirname(settings.STORAGE_DIR), file_path)
        )
        if os.path.exists(legacy_path):
            return legacy_path

    return None


@router.post("/jobs/{job_id}/upload", response_model=List[CandidateResponseSchema], status_code=status.HTTP_201_CREATED)
async def upload_candidates(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Tải lên nhiều file PDF CV, bóc tách text, che mờ PII và sao lưu PDF vào candidate_pdfs."""
    try:
        # Kiểm tra xem Job có tồn tại không. Nếu không (hoặc đã bị xóa), lưu trực tiếp CV vào kho candidates
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first() if job_id else None
        effective_job_id = job.id if job else None

        # Đếm số ứng viên hiện tại trong DB để tạo bí danh Candidate #01, #02...
        current_count = db.query(Candidate).count()

        created_candidates = []
        safe_folder_name = job_id if job_id else "general"
        job_storage_dir = os.path.join(settings.STORAGE_DIR, "uploads", safe_folder_name)
        os.makedirs(job_storage_dir, exist_ok=True)

        for idx, upload_file in enumerate(files):
            if not upload_file.filename.lower().endswith(".pdf"):
                continue

            candidate_number = current_count + idx + 1
            masked_name = f"Candidate #{candidate_number:02d}"

            # Save file PDF lên đĩa tạm thời
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
                job_id=effective_job_id,
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
            # Lưu bản sao PDF độc lập vào bảng candidate_pdfs
            try:
                storage_service.save_pdf(db, c.id, c.file_path)
            except Exception as e:
                print(f"Lỗi sao lưu PDF: {e}")

        return created_candidates
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý nạp CV: {str(e)}")

@router.get("/jobs/{job_id}", response_model=List[CandidateResponseSchema])
def list_candidates_by_job(job_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách các ứng viên theo Job ID."""
    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).order_by(Candidate.created_at.asc()).all()
    for c in candidates:
        c.text_preview = c.masked_text[:200] if c.masked_text else ""
    return candidates

@router.get("/{candidate_id}/pdf")
def get_candidate_pdf(candidate_id: str, db: Session = Depends(get_db)):
    """Stream file PDF CV gốc từ đĩa local hoặc phục hồi từ bảng candidate_pdfs."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    resolved_path = resolve_candidate_file_path(candidate.file_path)
    pdf_bytes, source = storage_service.get_pdf_bytes(db, candidate_id=candidate.id, local_path=resolved_path)

    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="File PDF không tồn tại.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=\"{candidate.original_filename}\""
        }
    )

