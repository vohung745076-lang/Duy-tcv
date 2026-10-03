from typing import List, Optional
from datetime import datetime
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.job import JobDescription
from app.services.email_service import email_service
from app.services.excel_export_service import excel_export_service

router = APIRouter()

class CandidateApprovalUpdate(BaseModel):
    approval_status: str  # "APPROVED" hoặc "REJECTED" hoặc "PENDING"
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = "Chuyên viên Tuyển dụng (HR)"
    send_rejection_email: Optional[bool] = False
    custom_email_body: Optional[str] = None

class InterviewEmailRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    interview_type: str  # "ONLINE" hoặc "OFFLINE"
    interview_time: str  # ví dụ: "09:30 AM, 28/09/2026"
    interview_location: str  # Địa chỉ công ty hoặc Link Google Meet
    interviewer_name: Optional[str] = "Hội đồng Tuyển dụng Doanh nghiệp"
    email_subject: Optional[str] = None
    email_body: Optional[str] = None

class BatchCandidateItem(BaseModel):
    candidate_id: str
    candidate_name: str
    candidate_email: str

class BatchInterviewEmailRequest(BaseModel):
    candidates: List[BatchCandidateItem]
    interview_type: str  # "ONLINE" hoặc "OFFLINE"
    interview_time: str
    interview_location: str
    interviewer_name: Optional[str] = "Hội đồng Tuyển dụng Doanh nghiệp"
    custom_notes: Optional[str] = None
    email_subject_template: Optional[str] = None
    email_body_template: Optional[str] = None


@router.get("/candidates")
def get_monthly_candidates(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
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


@router.get("/candidates/export-excel")
def export_monthly_candidates_excel(
    month: Optional[int] = None,
    year: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """
    Xuất danh sách ứng viên theo tháng ra file Excel (.xlsx) chuẩn.
    Bao gồm tên, vị trí, điểm AI, trạng thái tuyển dụng, tình trạng email (mời PV / từ chối / loại), lý do loại, người duyệt.
    """
    candidates_list = get_monthly_candidates(month=month, year=year, db=db, current_user=current_user)

    if status_filter and status_filter.upper() != "ALL":
        candidates_list = [
            c for c in candidates_list
            if (c.get("approval_status") or "PENDING").upper() == status_filter.upper()
        ]

    excel_bytes = excel_export_service.generate_monthly_candidates_excel(
        candidates_data=candidates_list,
        month=month,
        year=year,
    )

    period_filename = f"Thang_{month}_{year}" if month and year else (f"Nam_{year}" if year else "Tat_Ca_Thang")
    ascii_filename = f"Bao_Cao_Ung_Vien_{period_filename}.xlsx"
    utf8_filename = urllib.parse.quote(f"Báo_Cáo_Ứng_Viên_{period_filename}.xlsx")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{utf8_filename}',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.patch("/candidates/{candidate_id}/approval")
def update_candidate_approval(
    candidate_id: str,
    payload: CandidateApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """
    Cập nhật trạng thái phê duyệt của ứng viên (Yêu cầu quyền ADMIN hoặc RECRUITER):
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

    email_sent = False
    email_message = None

    if payload.approval_status == "REJECTED" and payload.send_rejection_email and candidate.email:
        from app.services.email.validator import is_valid_email, clean_email
        clean_cand_email = clean_email(candidate.email)
        if not is_valid_email(clean_cand_email):
            email_sent = False
            email_message = f"Email '{candidate.email}' không đúng định dạng (thiếu @ hoặc tên miền). Thư từ chối chưa được phát đi."
        else:
            job = db.query(JobDescription).filter(JobDescription.id == candidate.job_id).first()
            job_title = job.title if job else "Vị trí Tuyển dụng"
            rejection_reason = payload.rejection_reason or "Chưa đáp ứng đủ các tiêu chuẩn chuyên biệt của đợt tuyển dụng lần này."

        email_sent, email_message = email_service.send_rejection_email(
            to_email=candidate.email,
            candidate_name=candidate.masked_name,
            job_title=job_title,
            rejection_reason=rejection_reason,
            sender_name=payload.reviewed_by or "Ban Tuyển Dụng & Nhân Sự",
            custom_body=payload.custom_email_body
        )

        from app.services.audit_service import audit_service
        audit_service.log_action(
            db=db,
            action="SEND_REJECTION_EMAIL",
            user_id=current_user.id if hasattr(current_user, 'id') else "HR_USER",
            new_value={"candidate_id": candidate.id, "email": candidate.email, "email_sent": email_sent},
            justification=f"Loại hồ sơ & gửi thư phản hồi: {rejection_reason}"
        )

    return {
        "message": "Cập nhật trạng thái thành công.",
        "candidate_id": candidate.id,
        "approval_status": candidate.approval_status,
        "rejection_reason": candidate.rejection_reason,
        "reviewed_by": candidate.reviewed_by,
        "email_sent": email_sent,
        "email_message": email_message
    }

@router.post("/candidates/{candidate_id}/schedule-interview")
def schedule_interview_only(
    candidate_id: str,
    payload: InterviewEmailRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """
    Lưu thông tin lịch hẹn phỏng vấn vào hệ thống và phê duyệt ứng viên (Yêu cầu quyền ADMIN hoặc RECRUITER).
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
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """
    Lưu thông tin phỏng vấn và kích hoạt gửi email tự động (Yêu cầu quyền ADMIN hoặc RECRUITER).
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")

    from app.services.email.validator import is_valid_email, clean_email
    clean_target_email = clean_email(payload.candidate_email)
    if not is_valid_email(clean_target_email):
        return {
            "success": False,
            "message": f"Địa chỉ email '{payload.candidate_email}' không hợp lệ (thiếu dấu @ hoặc tên miền .com/.edu.vn...). Vui lòng nhập đúng email trước khi gửi!",
            "sent_to": payload.candidate_email,
            "candidate": {
                "id": candidate.id,
                "masked_name": candidate.masked_name,
                "email": candidate.email,
                "approval_status": candidate.approval_status
            }
        }

    # Cập nhật thông tin phỏng vấn vào database
    candidate.email = clean_target_email
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

    from app.services.audit_service import audit_service
    audit_service.log_action(
        db=db,
        action="SEND_INTERVIEW_EMAIL",
        user_id=current_user.id if hasattr(current_user, 'id') else "HR_USER",
        new_value={
            "candidate_id": candidate.id,
            "email": candidate.email,
            "email_sent": send_success,
            "interview_type": candidate.interview_type,
            "interview_time": candidate.interview_time
        },
        justification=f"Gửi thư mời phỏng vấn {candidate.interview_type} tới ứng viên {candidate.masked_name}: {status_msg}"
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


@router.post("/candidates/batch-send-interview")
def batch_send_interview_emails(
    payload: BatchInterviewEmailRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """
    Gửi thư mời phỏng vấn hàng loạt tới nhiều ứng viên qua Webhook HTTPS Cổng 443.
    Có cơ chế giãn cách thời gian (rate-limiting 1.2s) chống bị Google đánh dấu spam.
    Kiểm tra chặt chẽ định dạng email chuẩn RFC trước khi phát đi.
    """
    import time
    from app.services.email.validator import is_valid_email, clean_email
    from app.services.audit_service import audit_service

    if not payload.candidates:
        raise HTTPException(status_code=400, detail="Danh sách ứng viên rỗng.")

    results = []
    success_count = 0
    failure_count = 0

    total = len(payload.candidates)

    for idx, item in enumerate(payload.candidates):
        cand_id = item.candidate_id
        cand_name = item.candidate_name
        raw_email = clean_email(item.candidate_email)

        candidate = db.query(Candidate).filter(Candidate.id == cand_id).first()
        if not candidate:
            failure_count += 1
            results.append({
                "candidate_id": cand_id,
                "candidate_name": cand_name,
                "email": raw_email,
                "success": False,
                "message": "Không tìm thấy hồ sơ ứng viên trong hệ thống."
            })
            continue

        # 1. Kiểm tra tính hợp lệ của địa chỉ email
        if not is_valid_email(raw_email):
            failure_count += 1
            results.append({
                "candidate_id": cand_id,
                "candidate_name": cand_name,
                "email": raw_email,
                "success": False,
                "message": f"Địa chỉ email '{raw_email}' không hợp lệ (thiếu @ hoặc tên miền). Vui lòng kiểm tra lại!"
            })
            continue

        # 2. Cập nhật trạng thái ứng viên
        candidate.email = raw_email
        if cand_name and cand_name.strip():
            candidate.masked_name = cand_name.strip()
        candidate.approval_status = "APPROVED"
        candidate.interview_type = payload.interview_type
        candidate.interview_time = payload.interview_time
        candidate.interview_location = payload.interview_location
        candidate.reviewed_by = payload.interviewer_name
        db.commit()
        db.refresh(candidate)

        # Lấy tên Job
        job = db.query(JobDescription).filter(JobDescription.id == candidate.job_id).first() if candidate.job_id else None
        job_title = job.title if job else "Vị trí Tuyển dụng"

        # 3. Cá nhân hóa tiêu đề và nội dung thư
        subject = payload.email_subject_template or f"[THƯ MỜI PHỎNG VẤN] - Vị trí {job_title} - {cand_name}"
        subject = subject.replace("{name}", cand_name).replace("{job_title}", job_title)

        body = payload.email_body_template or ""
        if body:
            body = body.replace("{name}", cand_name).replace("{job_title}", job_title)

        # 4. Gửi email qua Webhook
        send_success, status_msg = email_service.send_interview_email(
            to_email=raw_email,
            candidate_name=cand_name,
            interview_type=payload.interview_type,
            interview_time=payload.interview_time,
            interview_location=payload.interview_location,
            interviewer_name=payload.interviewer_name,
            custom_notes=payload.custom_notes,
            email_subject=subject,
            email_body=body if body else None
        )

        if send_success:
            success_count += 1
        else:
            failure_count += 1

        # 5. Ghi nhật ký kiểm toán
        audit_service.log_action(
            db=db,
            action="BATCH_SEND_INTERVIEW_EMAIL",
            user_id=current_user.id if hasattr(current_user, 'id') else "HR_USER",
            new_value={
                "candidate_id": candidate.id,
                "email": raw_email,
                "email_sent": send_success,
                "batch_index": f"{idx+1}/{total}"
            },
            justification=f"Gửi thư mời phỏng vấn hàng loạt tới {cand_name} ({raw_email}): {status_msg}"
        )

        results.append({
            "candidate_id": cand_id,
            "candidate_name": cand_name,
            "email": raw_email,
            "success": send_success,
            "message": status_msg
        })

        # 6. Giãn cách an toàn 1.2s giữa mỗi email để tránh bị Google coi là spam
        if idx < total - 1:
            time.sleep(1.2)

    return {
        "total": total,
        "success_count": success_count,
        "failure_count": failure_count,
        "results": results
    }

