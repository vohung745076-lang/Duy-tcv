from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationResponseSchema
from app.services.ai_evaluator import ai_evaluator_service
from app.services.audit_service import audit_service

router = APIRouter()

@router.post("/process/{candidate_id}", response_model=EvaluationResponseSchema)
def run_evaluation(candidate_id: str, db: Session = Depends(get_db)):
    """Kích hoạt AI Pipeline để đánh giá đối soát CV với JD."""
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
def get_evaluation_by_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Lấy dữ liệu đánh giá chi tiết cho màn hình Split-View Workspace."""
    evaluation = db.query(Evaluation).filter(Evaluation.candidate_id == candidate_id).first()
    if not evaluation:
        # Nếu chưa có thì tự động run AI evaluation
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")
        return run_evaluation(candidate_id=candidate_id, db=db)
    return evaluation
