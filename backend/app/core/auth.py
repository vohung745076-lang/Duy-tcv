import time
import logging
import requests
from typing import Optional, List, Dict, Tuple
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status, Header, Request
from app.core.config import settings

logger = logging.getLogger(__name__)

class AuthenticatedUser(BaseModel):
    id: str
    email: str
    role: str = "PENDING"  # "ADMIN", "RECRUITER", "PENDING"
    full_name: Optional[str] = None

# Cache in-memory ngắn hạn cho JWT Token (5 phút) để tránh gọi Supabase quá tải
_TOKEN_CACHE: Dict[str, Tuple[AuthenticatedUser, float]] = {}
CACHE_TTL_SECONDS = 300.0  # 5 minutes

def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> AuthenticatedUser:
    """
    Xác thực JWT Token cấp từ Supabase Auth.
    Đảm bảo 100% người gọi API phải có phiên đăng nhập hợp lệ.
    """
    # Nếu tắt chế độ xác thực cho unit tests cục bộ
    if not settings.ENABLE_BACKEND_AUTH:
        return AuthenticatedUser(id="test-admin-id", email="test@admin.local", role="ADMIN", full_name="Test Admin")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Truy cập bị từ chối: Yêu cầu mã xác thực Bearer token trong Header Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã token rỗng.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Kiểm tra cache
    now = time.time()
    if token in _TOKEN_CACHE:
        cached_user, expire_at = _TOKEN_CACHE[token]
        if now < expire_at:
            return cached_user
        else:
            del _TOKEN_CACHE[token]

    # 2. Gọi Supabase Auth API để xác minh token
    supabase_url = settings.SUPABASE_URL.rstrip("/")
    supabase_anon_key = settings.SUPABASE_ANON_KEY

    auth_endpoint = f"{supabase_url}/auth/v1/user"
    headers = {
        "apikey": supabase_anon_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        resp = requests.get(auth_endpoint, headers=headers, timeout=10)
        if resp.status_code != 200:
            logger.warning(f"Supabase auth failed: {resp.status_code} - {resp.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_data = resp.json()
        user_id = user_data.get("id")
        user_email = user_data.get("email", "")

        # 3. Lấy thông tin role từ bảng public.profiles
        role = "PENDING"
        full_name = user_data.get("user_metadata", {}).get("full_name") or user_email.split("@")[0]

        try:
            profile_endpoint = f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=role,full_name"
            p_resp = requests.get(profile_endpoint, headers=headers, timeout=5)
            if p_resp.status_code == 200:
                p_data = p_resp.json()
                if p_data and len(p_data) > 0:
                    role = p_data[0].get("role", "PENDING")
                    if p_data[0].get("full_name"):
                        full_name = p_data[0]["full_name"]
        except Exception as e:
            logger.warning(f"Không thể truy vấn role từ profiles, dùng mặc định PENDING: {e}")
            role = user_data.get("user_metadata", {}).get("role", "PENDING")

        authenticated_user = AuthenticatedUser(
            id=user_id,
            email=user_email,
            role=role,
            full_name=full_name,
        )

        # Lưu vào cache 5 phút
        _TOKEN_CACHE[token] = (authenticated_user, now + CACHE_TTL_SECONDS)
        return authenticated_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi mạng khi gọi máy chủ Supabase Auth: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kết nối đến máy chủ xác thực tài khoản. Vui lòng thử lại.",
        )

def require_role(allowed_roles: List[str]):
    """
    Dependency bắt buộc người dùng phải có một trong các vai trò trong allowed_roles.
    Nếu là 'PENDING', sẽ trả về HTTP 403 Forbidden chặn toàn bộ thao tác ghi/sửa/xóa.
    """
    def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản của bạn ({current_user.email} - Vai trò: {current_user.role}) chưa được cấp quyền thực hiện chức năng này. Quyền yêu cầu: {', '.join(allowed_roles)}."
            )
        return current_user

    return role_checker
