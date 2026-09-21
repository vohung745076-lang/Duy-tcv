from sqlalchemy import Column, String, Text, JSON
from app.models.base import BaseModel

class JobDescription(BaseModel):
    __tablename__ = "job_descriptions"

    title = Column(String, nullable=False, index=True)
    department = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    criteria = Column(JSON, nullable=False) # { weights: {...}, required_skills: [...], preferred_skills: [...], min_years_experience: 3, education_level: "..." }
    status = Column(String, default="OPEN") # OPEN, CLOSED, DRAFT
    created_by = Column(String, nullable=True)
