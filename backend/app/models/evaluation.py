from sqlalchemy import Column, String, Float, Text, JSON, ForeignKey
from app.models.base import BaseModel

class Evaluation(BaseModel):
    __tablename__ = "evaluations"

    candidate_id = Column(String, ForeignKey("candidates.id"), unique=True, nullable=False, index=True)
    job_id = Column(String, ForeignKey("job_descriptions.id"), nullable=False, index=True)
    
    # AI Scores
    overall_score = Column(Float, nullable=False, default=0.0)
    skills_score = Column(Float, nullable=False, default=0.0)
    experience_score = Column(Float, nullable=False, default=0.0)
    education_score = Column(Float, nullable=False, default=0.0)
    
    # AI Evidence Citations & Analysis
    breakdown = Column(JSON, nullable=True) # Full structured breakdown with raw_quotes and evidence
    interview_questions = Column(JSON, nullable=True) # List of generated 3-5 interview questions
    ai_summary = Column(Text, nullable=True)
    
    # Human-in-the-loop Overrides
    hr_override_score = Column(Float, nullable=True)
    hr_override_reason = Column(Text, nullable=True)
    evaluation_status = Column(String, default="AI_EVALUATED") # AI_EVALUATED, HR_VERIFIED, OVERRIDDEN
