from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationResponseSchema
from app.services.ai_evaluator import ai_evaluator_service
from app.services.audit_service import audit_service

router = APIRouter()

@router.post("/process/{candidate_id}", response_model=EvaluationResponseSchema)
def run_evaluation(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """Kích hoạt AI Pipeline để đánh giá đối soát CV với JD. Yêu cầu quyền ADMIN hoặc RECRUITER."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng viên.")

    job = db.query(JobDescription).filter(JobDescription.id == candidate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng liên quan.")

    # Đánh giá bằng AI Evaluator
    ai_result = ai_evaluator_service.evaluate_cv(
        masked_cv_text=candidate.masked_text or candidate.raw_text,
        job_title=job.title,
        criteria=job.criteria
    )

    # Đã có evaluation trước đó chưa?
    existing_eval = db.query(Evaluation).filter(Evaluation.candidate_id == candidate_id).first()

    breakdown = ai_result.get("breakdown", {})
    skills_score = breakdown.get("skills", {}).get("score", 0.0)
    exp_score = breakdown.get("experience", {}).get("score", 0.0)
    edu_score = breakdown.get("education", {}).get("score", 0.0)
    overall_score = ai_result.get("overall_score", 0.0)

    if existing_eval:
        existing_eval.overall_score = overall_score
        existing_eval.skills_score = skills_score
        existing_eval.experience_score = exp_score
        existing_eval.education_score = edu_score
        existing_eval.breakdown = breakdown
        existing_eval.interview_questions = ai_result.get("interview_questions", [])
        existing_eval.ai_summary = ai_result.get("ai_summary", "")
        existing_eval.evaluation_status = "AI_EVALUATED"
        evaluation = existing_eval
    else:
        evaluation = Evaluation(
            candidate_id=candidate_id,
            job_id=candidate.job_id,
            overall_score=overall_score,
            skills_score=skills_score,
            experience_score=exp_score,
            education_score=edu_score,
            breakdown=breakdown,
            interview_questions=ai_result.get("interview_questions", []),
            ai_summary=ai_result.get("ai_summary", ""),
            evaluation_status="AI_EVALUATED"
        )
        db.add(evaluation)

    candidate.status = "EVALUATED"
    db.commit()
    db.refresh(evaluation)

    # Ghi log Audit Trail
    audit_service.log_action(
        db=db,
        action="AI_EVALUATION_COMPLETED",
        evaluation_id=evaluation.id,
        user_id="SYSTEM_AI",
        new_value={"overall_score": overall_score, "ai_summary": evaluation.ai_summary},
        justification="Hệ thống AI hoàn tất đối soát ngữ nghĩa CV với tiêu chí JD."
    )

    return evaluation

@router.get("/candidate/{candidate_id}", response_model=EvaluationResponseSchema)
def get_evaluation_by_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lấy dữ liệu đánh giá chi tiết cho màn hình Split-View Workspace. Yêu cầu đăng nhập."""
    evaluation = db.query(Evaluation).filter(Evaluation.candidate_id == candidate_id).first()
    if not evaluation:
        # Nếu chưa có thì tự động run AI evaluation
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")
        return run_evaluation(candidate_id=candidate_id, db=db, current_user=current_user)
    return evaluation


class ManualHighlightSchema(BaseModel):
    title: str
    category: str = "Kỹ năng chuyên môn"
    raw_quote: str
    value_add_analysis: Optional[str] = None


@router.post("/{evaluation_id}/manual-highlight", response_model=EvaluationResponseSchema)
def add_manual_highlight(
    evaluation_id: str,
    highlight_in: ManualHighlightSchema,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role(["ADMIN", "RECRUITER"])),
):
    """HR trực tiếp ghi nhận một kỹ năng / thế mạnh bổ sung trên CV mà AI bỏ sót."""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả đánh giá.")

    breakdown = dict(evaluation.breakdown) if evaluation.breakdown else {}
    additional_highlights = list(breakdown.get("additional_highlights", []))

    new_highlight = {
        "title": highlight_in.title.strip(),
        "category": highlight_in.category.strip(),
        "raw_quote": highlight_in.raw_quote.strip(),
        "value_add_analysis": highlight_in.value_add_analysis.strip() if highlight_in.value_add_analysis else f"Kỹ năng '{highlight_in.title}' do HR ghi nhận trực tiếp từ hồ sơ.",
        "is_hr_added": True,
        "added_by": current_user.email or current_user.id
    }

    # Tránh trùng lặp tiêu đề
    existing_titles = [h.get("title", "").lower() for h in additional_highlights]
    if new_highlight["title"].lower() in existing_titles:
        additional_highlights = [h for h in additional_highlights if h.get("title", "").lower() != new_highlight["title"].lower()]

    additional_highlights.append(new_highlight)
    breakdown["additional_highlights"] = additional_highlights
    evaluation.breakdown = breakdown

    db.commit()
    db.refresh(evaluation)

    # Ghi log Audit Trail với danh tính thật của HR
    actor_id = current_user.email if current_user.email else current_user.id
    audit_service.log_action(
        db=db,
        action="HR_MANUAL_HIGHLIGHT_ADDED",
        evaluation_id=evaluation.id,
        user_id=actor_id,
        new_value=new_highlight,
        justification=f"HR trực tiếp ghi nhận kỹ năng '{highlight_in.title}' từ hồ sơ ứng viên."
    )

    return evaluation

