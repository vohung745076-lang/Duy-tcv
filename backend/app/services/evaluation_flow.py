import os
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.services.ai_evaluator import ai_evaluator_service
from app.services.audit_service import audit_service
from app.services.pdf_service import pdf_service
from app.services.pii_service import pii_service
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


def evaluate_candidate_by_id(
    candidate_id: str,
    job_id: Optional[str],
    db: Session,
    performed_by: str = "SYSTEM_AI"
) -> Optional[Evaluation]:
    """
    Tiến hành AI screening toàn diện cho một ứng viên:
    1. Kiểm tra Candidate và JobDescription.
    2. Phục hồi văn bản CV từ đĩa / storage_service nếu cần.
    3. Đưa qua ai_evaluator_service thẩm định tiêu chuẩn JD.
    4. Cập nhật bảng Evaluation và gán Candidate.status = 'EVALUATED'.
    5. Ghi vết Audit Trail bất biến.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        logger.warning(f"Không tìm thấy ứng viên {candidate_id} để đánh giá AI.")
        return None

    effective_job_id = job_id or candidate.job_id
    job = db.query(JobDescription).filter(JobDescription.id == effective_job_id).first() if effective_job_id else None
    if not job:
        logger.warning(f"Không tìm thấy Job {effective_job_id} cho ứng viên {candidate_id}.")
        return None

    # Phục hồi / cập nhật văn bản CV nếu chưa có
    cv_text = candidate.masked_text or candidate.raw_text or ""
    if len(cv_text.strip()) < 30 or "[hồ sơ" in cv_text.lower():
        resolved_path = candidate.file_path
        extracted = ""
        if resolved_path and os.path.exists(resolved_path):
            extracted = pdf_service.extract_text(resolved_path)
        else:
            pdf_bytes, _ = storage_service.get_pdf_bytes(db, candidate_id=candidate.id, local_path=resolved_path)
            if pdf_bytes:
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(pdf_bytes)
                    tmp_path = tmp.name
                extracted = pdf_service.extract_text(tmp_path)
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

        if extracted and len(extracted.strip()) > 20:
            candidate.raw_text = extracted
            candidate.masked_text = pii_service.mask_text(extracted)
            candidate.text_preview = candidate.masked_text[:200]
            db.commit()
            db.refresh(candidate)
            cv_text = candidate.masked_text

    # Chạy AI Evaluator
    ai_result = ai_evaluator_service.evaluate_cv(
        masked_cv_text=cv_text,
        job_title=job.title,
        criteria=job.criteria
    )

    breakdown = ai_result.get("breakdown", {})
    skills_score = breakdown.get("skills", {}).get("score", 0.0)
    exp_score = breakdown.get("experience", {}).get("score", 0.0)
    edu_score = breakdown.get("education", {}).get("score", 0.0)
    overall_score = ai_result.get("overall_score", 0.0)

    existing_eval = db.query(Evaluation).filter(Evaluation.candidate_id == candidate_id).first()
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
            job_id=job.id,
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
    try:
        audit_service.log_action(
            db=db,
            action="AI_EVALUATION_COMPLETED",
            evaluation_id=evaluation.id,
            user_id=performed_by,
            new_value={"overall_score": overall_score, "ai_summary": evaluation.ai_summary},
            justification="Tự động thẩm định hồ sơ ứng viên nạp từ nguồn Google Sheet theo tiêu chuẩn JD."
        )
    except Exception as e:
        logger.warning(f"Lỗi ghi audit log khi auto-evaluate: {e}")

    logger.info(f"Hoàn tất đánh giá AI cho ứng viên {candidate.masked_name} (ID: {candidate.id}) - Điểm: {overall_score}")
    return evaluation


def batch_evaluate_candidates(
    candidate_ids: List[str],
    job_id: str,
    performed_by: str = "SYSTEM_AI"
) -> int:
    """
    Tiến hành chấm điểm AI đồng loạt trong background task.
    Mỗi ứng viên được xử lý an toàn trong transaction riêng biệt.
    """
    if not candidate_ids:
        return 0

    evaluated_count = 0
    db = SessionLocal()
    try:
        for cid in candidate_ids:
            try:
                eval_res = evaluate_candidate_by_id(
                    candidate_id=cid,
                    job_id=job_id,
                    db=db,
                    performed_by=performed_by
                )
                if eval_res:
                    evaluated_count += 1
            except Exception as e:
                logger.error(f"Lỗi khi đánh giá candidate {cid}: {e}", exc_info=True)
                db.rollback()
    finally:
        db.close()

    logger.info(f"Đã hoàn thành batch evaluation cho {evaluated_count}/{len(candidate_ids)} ứng viên.")
    return evaluated_count
