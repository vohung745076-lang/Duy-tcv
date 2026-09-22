from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.evaluation import Evaluation
from app.models.candidate import Candidate
from app.schemas.evaluation import EvaluationOverrideSchema, EvaluationResponseSchema
from app.services.audit_service import audit_service

router = APIRouter()

@router.post("/{evaluation_id}", response_model=EvaluationResponseSchema)
def override_evaluation_score(
    evaluation_id: str,
    override_in: EvaluationOverrideSchema,
    db: Session = Depends(get_db)
):
    """HR ghi đè (override) điểm số của AI kèm bắt buộc nhập lý do (Human-in-the-loop)."""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả đánh giá.")

    old_score = evaluation.hr_override_score if evaluation.hr_override_score is not None else evaluation.overall_score
    old_reason = evaluation.hr_override_reason

    # Cập nhật điểm HR điều chỉnh
    evaluation.hr_override_score = override_in.hr_override_score
    evaluation.hr_override_reason = override_in.hr_override_reason
    evaluation.evaluation_status = "OVERRIDDEN"

    # Cập nhật trạng thái Candidate nếu điểm >= 70 là SHORTLISTED, ngược lại là UNDER_REVIEW
    candidate = db.query(Candidate).filter(Candidate.id == evaluation.candidate_id).first()
    if candidate:
        candidate.status = "SHORTLISTED" if override_in.hr_override_score >= 70.0 else "EVALUATED"

    db.commit()
    db.refresh(evaluation)

    # Ghi log nhật ký kiểm toán bất biến
    audit_service.log_action(
        db=db,
        action="HR_SCORE_OVERRIDE",
        evaluation_id=evaluation.id,
        user_id="HR_RECRUITER",
        old_value={"score": old_score, "reason": old_reason},
        new_value={"score": override_in.hr_override_score, "reason": override_in.hr_override_reason},
        justification=override_in.hr_override_reason
    )

    return evaluation
