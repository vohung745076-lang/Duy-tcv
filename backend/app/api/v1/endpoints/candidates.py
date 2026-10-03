import os
import shutil
import re
import urllib.parse
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.audit_log import AuditLog
from app.models.candidate_pdf import CandidatePDF
from app.schemas.candidate import CandidateResponseSchema, GoogleSyncRequestSchema, GoogleSyncResponseSchema
from app.services.pdf_service import pdf_service
from app.services.pii_service import pii_service
from app.services.storage_service import storage_service
from app.services.google_sync_service import google_sync_service
from app.services.evaluation_flow import batch_evaluate_candidates

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
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Tải lên nhiều file PDF CV, bóc tách text, che mờ PII và sao lưu PDF vào candidate_pdfs. Yêu cầu quyền ADMIN hoặc RECRUITER."""
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
            orig_name = upload_file.filename if upload_file.filename else f"Document_{idx+1}.pdf"
            candidate_number = current_count + idx + 1

            # Chuẩn hóa tên file lưu trữ (tự động gắn .pdf nếu file từ iPhone như Doc1 không có đuôi)
            clean_save_name = orig_name if orig_name.lower().endswith(".pdf") else f"{orig_name}.pdf"
            file_path = os.path.join(job_storage_dir, f"{candidate_number}_{clean_save_name}")

            # Save file lên đĩa tạm thời
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)

            # Extract text & PII Masking (hỗ trợ mọi file PDF / scan từ di động)
            raw_text = ""
            masked_text = ""
            try:
                raw_text = pdf_service.extract_text(file_path)
                if not raw_text or not raw_text.strip():
                    raw_text = f"Hồ sơ ứng viên: {orig_name}"
                masked_text = pii_service.mask_text(raw_text)
            except Exception as e:
                raw_text = f"[Hồ sơ ứng viên: {orig_name} - {str(e)}]"
                masked_text = raw_text

            # Tự động bóc tách Tên thật, Email và Số điện thoại từ CV
            contact_info = pii_service.extract_contact_info(raw_text, orig_name)
            extracted_name = contact_info["name"] if contact_info.get("name") else f"Candidate #{candidate_number:02d}"

            candidate = Candidate(
                job_id=effective_job_id,
                job_title=job.title if job else "Ứng viên tự do / Chung",
                original_filename=orig_name,
                file_path=file_path,
                masked_name=extracted_name,
                email=contact_info.get("email"),
                phone=contact_info.get("phone"),
                raw_text=raw_text,
                masked_text=masked_text,
                status="PARSED"
            )
            db.add(candidate)
            created_candidates.append(candidate)

        if len(created_candidates) == 0:
            raise HTTPException(status_code=400, detail="Không có tệp nào được chọn để nạp.")

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


@router.post("/jobs/{job_id}/sync-google-sheet", response_model=GoogleSyncResponseSchema)
def sync_google_sheet(
    job_id: str,
    payload: GoogleSyncRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Đồng bộ ứng viên từ Google Sheet liên kết Google Form, tải CV từ Google Drive và đối soát."""
    try:
        # 1. Đọc sheet, tải CV và đối soát trùng lặp
        result = google_sync_service.sync_and_reconcile(
            job_id=job_id,
            sheet_url=payload.sheet_url,
            db=db,
            auto_evaluate=False # Quản lý evaluate linh hoạt bên dưới
        )

        ready_ids = result.get("ready_candidate_ids", [])

        # 2. Tự động kích hoạt AI chấm điểm nếu được yêu cầu (mặc định cho luồng quét CV)
        if payload.auto_evaluate and ready_ids:
            if len(ready_ids) <= 2:
                # Nếu số lượng ít (1-2 hồ sơ): Chấm điểm trực tiếp ngay để trả về kết quả cho HR xem xét
                batch_evaluate_candidates(ready_ids, job_id, performed_by=current_user.email)
                # Refresh lại danh sách ứng viên trong response
                for c in result.get("candidates", []):
                    db.refresh(c)
                result["message"] += f" Đã hoàn thành AI thẩm định {len(ready_ids)} hồ sơ theo tiêu chí JD."
            else:
                # Nếu số lượng lớn (ví dụ 10-100 form): Đưa vào background task để không gây nghẽn kết nối
                background_tasks.add_task(
                    batch_evaluate_candidates,
                    ready_ids,
                    job_id,
                    current_user.email
                )
                result["message"] += f" Đang tự động kích hoạt AI chấm điểm ngầm cho {len(ready_ids)} hồ sơ..."

        try:
            audit = AuditLog(
                action="SYNC_GOOGLE_SHEET",
                performed_by=current_user.email,
                details=f"Đồng bộ Google Sheet: {result['total_rows']} dòng, {result['newly_imported']} mới, {result['duplicates_skipped']} trùng lặp. Sẵn sàng AI: {len(ready_ids)}."
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            print(f"Lỗi ghi log audit sync: {e}")

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi đồng bộ Google Sheet: {str(e)}")


@router.get("/jobs/{job_id}", response_model=List[CandidateResponseSchema])
def list_candidates_by_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Lấy danh sách các ứng viên theo Job ID. Yêu cầu quyền ADMIN hoặc RECRUITER."""
    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).order_by(Candidate.created_at.asc()).all()
    for c in candidates:
        c.text_preview = c.masked_text[:200] if c.masked_text else ""
    return candidates

@router.get("/{candidate_id}/pdf")
def get_candidate_pdf(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Stream file PDF CV gốc từ đĩa local hoặc phục hồi từ bảng candidate_pdfs. Yêu cầu quyền ADMIN hoặc RECRUITER."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    resolved_path = resolve_candidate_file_path(candidate.file_path)
    pdf_bytes, source = storage_service.get_pdf_bytes(db, candidate_id=candidate.id, local_path=resolved_path)

    # Nếu không có bytes hoặc file không phải là PDF chuẩn (ví dụ file DOCX gốc b"PK\x03\x04..."),
    # tự động chuyển đổi sang PDF chuẩn từ text bóc tách (raw_text hoặc masked_text)
    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        candidate_text = candidate.raw_text or candidate.masked_text
        if candidate_text and len(candidate_text.strip()) > 0:
            title = f"Hồ sơ ứng viên: {candidate.masked_name or candidate.original_filename or 'Ứng viên'}"
            pdf_bytes = pdf_service.create_pdf_from_text(title=title, text=candidate_text)
        elif not pdf_bytes:
            raise HTTPException(status_code=404, detail="File PDF không tồn tại.")

    # Chuẩn hóa tên file theo chuẩn RFC 5987 / RFC 6266
    # FastAPI/Starlette chỉ cho phép ký tự latin-1 (ASCII) trong trường filename tiêu chuẩn.
    # Tên tiếng Việt có dấu được mã hóa qua filename*=UTF-8''... để tương thích đa trình duyệt và tránh lỗi 500 Internal Server Error.
    raw_name = candidate.original_filename or f"candidate_{candidate_id[:8]}.pdf"
    if not raw_name.lower().endswith(".pdf"):
        base_part = os.path.splitext(raw_name)[0]
        raw_name = f"{base_part}.pdf"

    ascii_filename = re.sub(r'[^a-zA-Z0-9\._-]', '_', raw_name)
    if not ascii_filename.lower().endswith(".pdf"):
        ascii_filename += ".pdf"

    utf8_filename = urllib.parse.quote(raw_name)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{ascii_filename}"; filename*=UTF-8\'\'{utf8_filename}',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.delete("/{candidate_id}", status_code=status.HTTP_200_OK)
def delete_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Xóa vĩnh viễn một hồ sơ ứng viên khỏi hệ thống. Yêu cầu quyền ADMIN hoặc RECRUITER."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    try:
        # 1. Tìm các evaluation liên quan và xóa audit logs
        evaluations = db.query(Evaluation).filter(Evaluation.candidate_id == candidate_id).all()
        for ev in evaluations:
            db.query(AuditLog).filter(AuditLog.evaluation_id == ev.id).delete(synchronize_session=False)
            db.delete(ev)

        # 2. Xóa bản sao PDF trong database
        db.query(CandidatePDF).filter(CandidatePDF.candidate_id == candidate_id).delete(synchronize_session=False)

        # 3. Xóa file PDF vật lý trên đĩa nếu còn tồn tại
        resolved_path = resolve_candidate_file_path(candidate.file_path)
        if resolved_path and os.path.exists(resolved_path):
            try:
                os.remove(resolved_path)
            except Exception as e:
                print(f"Lỗi khi xóa file đĩa: {e}")

        # 4. Xóa ứng viên khỏi bảng candidates
        candidate_name = candidate.masked_name
        db.delete(candidate)
        db.commit()
        return {"message": f"Đã xóa vĩnh viễn hồ sơ của {candidate_name} thành công.", "deleted_id": candidate_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa hồ sơ ứng viên: {str(e)}")


