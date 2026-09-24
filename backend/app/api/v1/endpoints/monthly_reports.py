from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.job import JobDescription
from app.services.email_service import email_service

router = APIRouter()

class CandidateApprovalUpdate(BaseModel):
    approval_status: str  # "APPROVED" hoặc "REJECTED" hoặc "PENDING"
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = "Chuyên viên Tuyển dụng (HR)"

class InterviewEmailRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    interview_type: str  # "ONLINE" hoặc "OFFLINE"
    interview_time: str  # ví dụ: "09:30 AM, 28/09/2026"
    interview_location: str  # Địa chỉ công ty hoặc Link Google Meet
    interviewer_name: Optional[str] = "Hội đồng Tuyển dụng Doanh nghiệp"
    custom_notes: Optional[str] = None

@router.get("/candidates")
def get_monthly_candidates(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách ứng viên tổng hợp theo tháng/năm, kèm kết quả chấm điểm AI,
    người kiểm tra và trạng thái phê duyệt phỏng vấn.
    """
    query = db.query(Candidate).order_by(Candidate.created_at.desc())
    candidates = query.all()

    # Lấy danh sách đánh giá
    cand_ids = [c.id for c in candidates]
    evaluations = db.query(Evaluation).filter(Evaluation.candidate_id.in_(cand_ids)).all() if cand_ids else []
    eval_map = {e.candidate_id: e for e in evaluations}

    # Lấy tên Job nếu còn
    job_ids = list(set([c.job_id for c in candidates if c.job_id]))
    jobs = db.query(JobDescription).filter(JobDescription.id.in_(job_ids)).all() if job_ids else []
    job_map = {j.id: j.title for j in jobs}

    result = []
    for c in candidates:
        created_dt = c.created_at if c.created_at else datetime.utcnow()
        c_month = created_dt.month
        c_year = created_dt.year

        # Lọc theo tháng/năm nếu có tham số
        if month and c_month != month:
            continue
        if year and c_year != year:
            continue

        ev = eval_map.get(c.id)
        result.append({
            "id": c.id,
            "job_id": c.job_id,
            "job_title": c.job_title or job_map.get(c.job_id, "Hồ sơ lưu trữ chung"),
            "masked_name": c.masked_name,
            "original_filename": c.original_filename,
            "status": c.status,
            "created_at": created_dt.isoformat(),
            "month": c_month,
            "year": c_year,
            "email": c.email or f"{c.masked_name.lower().replace(' ', '')}@example.com",
            "phone": c.phone or "09xxxxxxxx",
            "approval_status": c.approval_status or "PENDING",
            "rejection_reason": c.rejection_reason,
            "interview_type": c.interview_type,
            "interview_time": c.interview_time,
            "interview_location": c.interview_location,
            "reviewed_by": c.reviewed_by or (ev.evaluation_status if ev else "Hệ thống AI"),
            "overall_score": ev.overall_score if ev else 0.0,
            "skills_score": ev.skills_score if ev else 0.0,
            "experience_score": ev.experience_score if ev else 0.0,
            "education_score": ev.education_score if ev else 0.0,
            "ai_summary": ev.ai_summary if ev else None,
        })

    return result

@router.patch("/candidates/{candidate_id}/approval")
def update_candidate_approval(
    candidate_id: str,
    payload: CandidateApprovalUpdate,
    db: Session = Depends(get_db)
):
    """
    Cập nhật trạng thái phê duyệt của ứng viên:
    - APPROVED: Đã duyệt
    - REJECTED: Đã loại (kèm lý do loại)
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    candidate.approval_status = payload.approval_status
    if payload.rejection_reason is not None:
        candidate.rejection_reason = payload.rejection_reason
    if payload.reviewed_by:
        candidate.reviewed_by = payload.reviewed_by

    db.commit()
    db.refresh(candidate)

    return {
        "message": "Cập nhật trạng thái thành công.",
        "candidate_id": candidate.id,
        "approval_status": candidate.approval_status,
        "rejection_reason": candidate.rejection_reason,
        "reviewed_by": candidate.reviewed_by
    }

@router.post("/candidates/{candidate_id}/send-interview-email")
def send_interview_email(
    candidate_id: str,
    payload: InterviewEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Kích hoạt cơ chế gửi email tự động mời phỏng vấn (Trực tiếp hoặc Online)
    và lưu lại vào hồ sơ ứng viên.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    # Cập nhật thông tin phỏng vấn vào database
    candidate.email = payload.candidate_email
    candidate.approval_status = "APPROVED"
    candidate.interview_type = payload.interview_type
    candidate.interview_time = payload.interview_time
    candidate.interview_location = payload.interview_location
    candidate.reviewed_by = payload.interviewer_name
    db.commit()

    # Thực hiện kích hoạt gửi email qua SMTP
    smtp_success = email_service.send_interview_email(
        to_email=payload.candidate_email,
        candidate_name=payload.candidate_name,
        interview_type=payload.interview_type,
        interview_time=payload.interview_time,
        interview_location=payload.interview_location,
        interviewer_name=payload.interviewer_name,
        custom_notes=payload.custom_notes
    )

    # Soạn nội dung email tự động làm bản xem trước
    type_label = "Phỏng vấn Online qua Google Meet / Teams" if payload.interview_type == "ONLINE" else "Phỏng vấn Trực tiếp tại Trụ sở Doanh nghiệp"
    email_content = f"""Kính gửi Anh/Chị {payload.candidate_name},

Lời đầu tiên, Ban Tuyển dụng xin gửi lời cảm ơn Anh/Chị đã dành thời gian quan tâm và nộp hồ sơ ứng tuyển.

Sau khi Hội đồng thẩm định và xem xét chi tiết hồ sơ CV, chúng tôi rất ấn tượng với năng lực của Anh/Chị và trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn chính thức:

- Hình thức phỏng vấn: {type_label}
- Thời gian: {payload.interview_time}
- Địa điểm / Đường dẫn phòng họp: {payload.interview_location}
- Thành phần tham dự: {payload.interviewer_name}
{f"- Ghi chú bổ sung: {payload.custom_notes}" if payload.custom_notes else ""}

Anh/Chị vui lòng phản hồi lại email này để xác nhận tham dự. Nếu có bất kỳ điều chỉnh nào về khung giờ, xin vui lòng thông báo sớm cho chúng tôi.

Trân trọng,
{payload.interviewer_name}
Bộ phận Nhân sự & Tuyển dụng
"""

    status_msg = f"Đã gửi email mời phỏng vấn tới {payload.candidate_email}!" if smtp_success else f"Đã lưu lịch phỏng vấn. (Chưa gửi SMTP do thiếu cấu hình SMTP_USER/SMTP_PASSWORD trong .env)"

    return {
        "success": True,
        "message": status_msg,
        "sent_to": payload.candidate_email,
        "sent_via_smtp": smtp_success,
        "interview_time": payload.interview_time,
        "interview_type": payload.interview_type,
        "email_preview": email_content
    }
