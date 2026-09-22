from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class CandidatePDF(Base):
    __tablename__ = "candidate_pdfs"

    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True)
    pdf_base64 = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
