import re
from typing import Optional

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

def is_valid_email(email: Optional[str]) -> bool:
    """
    Kiểm tra xem một chuỗi có phải là địa chỉ email hợp lệ hay không.
    Ngăn chặn việc gửi thư đến số điện thoại, MSSV không có tên miền (@...).
    """
    if not email or not isinstance(email, str):
        return False
    
    clean = email.strip()
    if len(clean) < 6 or len(clean) > 254:
        return False
        
    return bool(EMAIL_REGEX.match(clean))

def clean_email(email: Optional[str]) -> str:
    """Làm sạch địa chỉ email, loại bỏ khoảng trắng thừa."""
    if not email:
        return ""
    return email.strip()
