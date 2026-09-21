from sqlalchemy import Column, String, Text, ForeignKey
from app.models.base import BaseModel

class Candidate(BaseModel):
    __tablename__ = "candidates"

    job_id = Column(String, ForeignKey("job_descriptions.id"), nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    masked_name = Column(String, nullable=False) # Candidate #01, Candidate #02
    raw_text = Column(Text, nullable=True)
    masked_text = Column(Text, nullable=True)
    status = Column(String, default="SUBMITTED") # SUBMITTED, PARSED, EVALUATED, SHORTLISTED, REJECTED
