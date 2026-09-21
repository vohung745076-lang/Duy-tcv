from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class CriteriaWeights(BaseModel):
    skills: float = Field(0.5, ge=0.0, le=1.0)
    experience: float = Field(0.3, ge=0.0, le=1.0)
    education: float = Field(0.2, ge=0.0, le=1.0)

class JobCriteria(BaseModel):
    weights: CriteriaWeights = Field(default_factory=CriteriaWeights)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    min_years_experience: float = Field(0.0, ge=0.0)
    education_level: str = "Bachelor"

class JobCreateSchema(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    criteria: JobCriteria

class JobResponseSchema(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    criteria: JobCriteria
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
