from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        evaluation_id: Optional[str] = None,
        user_id: Optional[str] = "HR_USER",
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        justification: Optional[str] = None
    ) -> AuditLog:
        """Tạo bản ghi nhật ký kiểm toán (Audit Trail) không thể sửa/xóa."""
        audit_entry = AuditLog(
            evaluation_id=evaluation_id,
            user_id=user_id,
            action=action,
            old_value=old_value,
            new_value=new_value,
            justification=justification
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

audit_service = AuditService()
