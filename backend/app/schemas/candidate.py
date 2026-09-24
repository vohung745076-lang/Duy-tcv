from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class CandidateResponseSchema(BaseModel):
    id: str
    job_id: Optional[str] = None
    original_filename: str
    masked_name: str
    status: str
    created_at: datetime
    text_preview: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    approval_status: Optional[str] = "PENDING"
    rejection_reason: Optional[str] = None
    interview_type: Optional[str] = None
    interview_time: Optional[str] = None
    interview_location: Optional[str] = None
    reviewed_by: Optional[str] = None

    class Config:
        from_attributes = True
