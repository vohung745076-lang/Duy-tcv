from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class CandidateResponseSchema(BaseModel):
    id: str
    job_id: str
    original_filename: str
    masked_name: str
    status: str
    created_at: datetime
    text_preview: Optional[str] = None

    class Config:
        from_attributes = True
