from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class CandidateResponseSchema(BaseModel):
    id: str
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    original_filename: str
    masked_name: str
    status: str
    created_at: datetime
    text_preview: Optional[str] = None
    masked_text: Optional[str] = None
    raw_text: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    approval_status: Optional[str] = "PENDING"
    rejection_reason: Optional[str] = None
    interview_type: Optional[str] = None
    interview_time: Optional[str] = None
    interview_location: Optional[str] = None
    reviewed_by: Optional[str] = None
    google_drive_url: Optional[str] = None

    class Config:
        from_attributes = True

class GoogleSyncRequestSchema(BaseModel):
    sheet_url: str
    auto_evaluate: Optional[bool] = False

class GoogleSyncRowSchema(BaseModel):
    row_index: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    drive_url: Optional[str] = None
    status: str # "IMPORTED", "DUPLICATE", "NEEDS_PERMISSION", "FAILED"
    message: str
    candidate_id: Optional[str] = None

class GoogleSyncResponseSchema(BaseModel):
    success: bool
    sheet_title: Optional[str] = "Google Sheet"
    total_rows: int
    newly_imported: int
    duplicates_skipped: int
    permission_issues: int
    candidates: list[CandidateResponseSchema] = []
    reconciliation_rows: list[GoogleSyncRowSchema] = []
    message: str
