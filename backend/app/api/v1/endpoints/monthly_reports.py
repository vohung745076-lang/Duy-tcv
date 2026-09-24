from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
    email_subject: Optional[str] = None
    email_body: Optional[str] = None

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

@router.post("/candidates/{candidate_id}/schedule-interview")
def schedule_interview_only(
    candidate_id: str,
    payload: InterviewEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Lưu thông tin lịch hẹn phỏng vấn vào hệ thống và phê duyệt ứng viên
    (Dành cho trường hợp HR mở gửi trực tiếp qua Gmail 1-Click hoặc ứng dụng Mail).
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    candidate.email = payload.candidate_email
    if payload.candidate_name and payload.candidate_name.strip():
        candidate.masked_name = payload.candidate_name.strip()
    candidate.approval_status = "APPROVED"
    candidate.interview_type = payload.interview_type
    candidate.interview_time = payload.interview_time
    candidate.interview_location = payload.interview_location
    candidate.reviewed_by = payload.interviewer_name
    db.commit()
    db.refresh(candidate)

    return {
        "success": True,
        "message": "Đã lưu thông tin phỏng vấn và phê duyệt ứng viên thành công!",
        "candidate": {
            "id": candidate.id,
            "masked_name": candidate.masked_name,
            "email": candidate.email,
            "approval_status": candidate.approval_status,
            "interview_time": candidate.interview_time,
            "interview_type": candidate.interview_type,
            "interview_location": candidate.interview_location
        }
    }

@router.post("/candidates/{candidate_id}/send-interview-email")
def send_interview_email(
    candidate_id: str,
    payload: InterviewEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Lưu thông tin phỏng vấn và kích hoạt gửi email tự động với báo cáo trạng thái chính xác.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    # Cập nhật thông tin phỏng vấn vào database
    candidate.email = payload.candidate_email
    if payload.candidate_name and payload.candidate_name.strip():
        candidate.masked_name = payload.candidate_name.strip()
    candidate.approval_status = "APPROVED"
    candidate.interview_type = payload.interview_type
    candidate.interview_time = payload.interview_time
    candidate.interview_location = payload.interview_location
    candidate.reviewed_by = payload.interviewer_name
    db.commit()
    db.refresh(candidate)

    # Gửi email thực tế và kiểm tra kết quả chính xác
    send_success, status_msg = email_service.send_interview_email(
        to_email=payload.candidate_email,
        candidate_name=payload.candidate_name,
        interview_type=payload.interview_type,
        interview_time=payload.interview_time,
        interview_location=payload.interview_location,
        interviewer_name=payload.interviewer_name,
        custom_notes=payload.custom_notes,
        email_subject=payload.email_subject,
        email_body=payload.email_body
    )

    return {
        "success": send_success,
        "message": status_msg,
        "sent_to": payload.candidate_email,
        "candidate": {
            "id": candidate.id,
            "masked_name": candidate.masked_name,
            "email": candidate.email,
            "approval_status": candidate.approval_status,
            "interview_time": candidate.interview_time,
            "interview_type": candidate.interview_type,
            "interview_location": candidate.interview_location
        }
    }
