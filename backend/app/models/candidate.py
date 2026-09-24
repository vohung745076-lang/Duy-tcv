from sqlalchemy import Column, String, Text, ForeignKey
from app.models.base import BaseModel

class Candidate(BaseModel):
    __tablename__ = "candidates"

    job_id = Column(String, ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    job_title = Column(String, nullable=True) # Lưu cứng tên vị trí (Snapshot) để bảo toàn khi xóa Job
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    masked_name = Column(String, nullable=False) # Candidate #01, Candidate #02
    raw_text = Column(Text, nullable=True)
    masked_text = Column(Text, nullable=True)
    status = Column(String, default="SUBMITTED") # SUBMITTED, PARSED, EVALUATED, SHORTLISTED, REJECTED
    
    # Thông tin liên lạc & Quy trình phê duyệt theo tháng
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    approval_status = Column(String, default="PENDING") # PENDING (Chờ HR duyệt), APPROVED (Đã duyệt), REJECTED (Đã loại)
    rejection_reason = Column(Text, nullable=True)
    interview_type = Column(String, nullable=True) # ONLINE, OFFLINE
    interview_time = Column(String, nullable=True)
    interview_location = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True) # Tên AI / HR đã kiểm tra
