from sqlalchemy import Column, String, JSON, ForeignKey
from app.models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    evaluation_id = Column(String, ForeignKey("evaluations.id"), nullable=True, index=True)
    user_id = Column(String, nullable=True) # ID HR hoặc System/AI
    action = Column(String, nullable=False) # AI_SCORED, HR_OVERRIDE, STATUS_CHANGED
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    justification = Column(String, nullable=True)
