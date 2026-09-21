from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class EvidenceItem(BaseModel):
    criterion: str
    matched: bool
    score: Optional[float] = 0.0
    raw_quote: str = ""
    explanation: str = ""

class SkillsBreakdown(BaseModel):
    score: float
    evidence: List[EvidenceItem] = Field(default_factory=list)

class ExperienceBreakdown(BaseModel):
    score: float
    evidence: List[EvidenceItem] = Field(default_factory=list)

class EducationBreakdown(BaseModel):
    score: float
    evidence: List[EvidenceItem] = Field(default_factory=list)

class EvaluationBreakdown(BaseModel):
    skills: SkillsBreakdown
    experience: ExperienceBreakdown
    education: EducationBreakdown

class InterviewQuestion(BaseModel):
    question: str
    reason_to_ask: str

class AiEvaluationOutput(BaseModel):
    overall_score: float
    breakdown: EvaluationBreakdown
    ai_summary: str
    interview_questions: List[InterviewQuestion] = Field(default_factory=list)

class EvaluationOverrideSchema(BaseModel):
    hr_override_score: float = Field(..., ge=0.0, le=100.0)
    hr_override_reason: str = Field(..., min_length=5)

class EvaluationResponseSchema(BaseModel):
    id: str
    candidate_id: str
    job_id: str
    overall_score: float
    skills_score: float
    experience_score: float
    education_score: float
    breakdown: Optional[Dict[str, Any]] = None
    interview_questions: Optional[List[Dict[str, Any]]] = None
    ai_summary: Optional[str] = None
    hr_override_score: Optional[float] = None
    hr_override_reason: Optional[str] = None
    evaluation_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
