from typing import Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class AuditLogResponseSchema(BaseModel):
    id: str
    evaluation_id: Optional[str] = None
    user_id: Optional[str] = None
    action: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    justification: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
