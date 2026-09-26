from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponseSchema

router = APIRouter()

@router.get("/jobs/{job_id}/ranking")
def get_job_ranking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lấy Bảng xếp hạng ứng viên theo Job ID, ưu tiên hr_override_score nếu có. Yêu cầu đăng nhập."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")

    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).all()
    
    ranking_data = []
    for cand in candidates:
        eval_item = db.query(Evaluation).filter(Evaluation.candidate_id == cand.id).first()
        if eval_item:
            final_score = eval_item.hr_override_score if eval_item.hr_override_score is not None else eval_item.overall_score
            is_overridden = eval_item.hr_override_score is not None
            eval_status = eval_item.evaluation_status
            ai_score = eval_item.overall_score
            skills_score = eval_item.skills_score
            exp_score = eval_item.experience_score
            edu_score = eval_item.education_score
            ai_summary = eval_item.ai_summary
            override_reason = eval_item.hr_override_reason
        else:
            final_score = 0.0
            is_overridden = False
            eval_status = "PENDING"
            ai_score = 0.0
            skills_score = 0.0
            exp_score = 0.0
            edu_score = 0.0
            ai_summary = "Chưa đánh giá"
            override_reason = None

        ranking_data.append({
            "candidate_id": cand.id,
            "masked_name": cand.masked_name,
            "original_filename": cand.original_filename,
            "status": cand.status,
            "final_score": round(final_score, 1),
            "ai_score": round(ai_score, 1),
            "skills_score": round(skills_score, 1),
            "experience_score": round(exp_score, 1),
            "education_score": round(edu_score, 1),
            "is_overridden": is_overridden,
            "evaluation_status": eval_status,
            "ai_summary": ai_summary,
            "override_reason": override_reason,
            "created_at": cand.created_at
        })

    # Sắp xếp giảm dần theo final_score
    ranking_data.sort(key=lambda x: x["final_score"], reverse=True)

    # Đánh số thứ tự xếp hạng (rank)
    for idx, item in enumerate(ranking_data):
        item["rank"] = idx + 1

    return {
        "job_id": job_id,
        "job_title": job.title,
        "total_candidates": len(ranking_data),
        "rankings": ranking_data
    }

@router.get("/audit-logs", response_model=List[AuditLogResponseSchema])
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lấy danh sách nhật ký kiểm toán (Audit Trail). Yêu cầu đăng nhập."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
