import os
import base64
import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.candidate_pdf import CandidatePDF

logger = logging.getLogger(__name__)

class StorageService:
    """Service lưu trữ và phục hồi tài liệu PDF độc lập."""

    def save_pdf(self, db: Session, candidate_id: str, file_path: str) -> bool:
        """Đọc file PDF từ đĩa và lưu bản sao mã hóa Base64 vào bảng candidate_pdfs."""
        try:
            if not os.path.exists(file_path):
                logger.error(f"File không tồn tại trên đĩa để mã hóa: {file_path}")
                return False

            with open(file_path, "rb") as pdf_file:
                encoded_string = base64.b64encode(pdf_file.read()).decode("utf-8")

            existing = db.query(CandidatePDF).filter(CandidatePDF.candidate_id == candidate_id).first()
            if existing:
                existing.pdf_base64 = encoded_string
            else:
                new_pdf = CandidatePDF(candidate_id=candidate_id, pdf_base64=encoded_string)
                db.add(new_pdf)

            db.commit()
            return True
        except Exception as e:
            logger.error(f"Lỗi khi lưu PDF vào candidate_pdfs: {str(e)}")
            db.rollback()
            return False

    def get_pdf_bytes(self, db: Session, candidate_id: str, local_path: Optional[str] = None) -> Tuple[Optional[bytes], str]:
        """
        Lấy nội dung bytes của PDF:
        1. Ưu tiên đọc từ ổ đĩa local if file_path tồn tại.
        2. Nếu file đĩa bị xóa (do Render restart), lấy từ bảng candidate_pdfs giải mã Base64.
        """
        # Ưu tiên 1: Đọc từ ổ đĩa
        if local_path and os.path.exists(local_path):
            try:
                with open(local_path, "rb") as f:
                    return f.read(), "DISK"
            except Exception as e:
                logger.warning(f"Không thể đọc file từ đĩa: {str(e)}")

        # Ưu tiên 2: Phục hồi từ DB candidate_pdfs
        try:
            pdf_record = db.query(CandidatePDF).filter(CandidatePDF.candidate_id == candidate_id).first()
            if pdf_record and pdf_record.pdf_base64:
                decoded_bytes = base64.b64decode(pdf_record.pdf_base64)
                return decoded_bytes, "DATABASE"
        except Exception as e:
            logger.error(f"Lỗi khi giải mã PDF từ DB: {str(e)}")

        return None, "NOT_FOUND"

storage_service = StorageService()
