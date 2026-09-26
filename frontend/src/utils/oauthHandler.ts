/**
 * Module chuyên trách bóc tách, chuẩn hóa và xử lý URL chuyển hướng OAuth (Google / Supabase)
 * Tuân thủ nguyên tắc phân chia file/folder độc lập để dễ mở rộng.
 */

export interface OAuthCallbackResult {
  hasCallback: boolean;
  code?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Trích xuất tham số từ URL (hỗ trợ cả search query ? và hash #)
 */
export function parseOAuthCallback(): OAuthCallbackResult {
  if (typeof window === 'undefined') {
    return { hasCallback: false };
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  // Lấy params từ hash fragment nếu dùng implicit flow (ví dụ: /#access_token=... hoặc /#error=...)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  const code = searchParams.get('code') || hashParams.get('code') || undefined;
  const error = searchParams.get('error') || hashParams.get('error') || undefined;
  const errorDescription =
    searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    undefined;

  const hasCallback = Boolean(code || error || errorDescription);

  return {
    hasCallback,
    code,
    error,
    errorDescription,
  };
}

/**
 * Phiên dịch mã lỗi kỹ thuật từ Google / Supabase sang thông điệp tiếng Việt thân thiện
 */
export function translateOAuthError(error?: string, description?: string): string {
  if (!error && !description) {
    return 'Đăng nhập không thành công. Vui lòng thử lại.';
  }

  const errStr = (error || '').toLowerCase();
  const descStr = (description || '').toLowerCase();

  if (errStr === 'access_denied' || descStr.includes('user denied') || descStr.includes('access_denied')) {
    return 'Bạn đã hủy yêu cầu đăng nhập bằng tài khoản Google.';
  }

  if (descStr.includes('already exists') || descStr.includes('identity_already_exists')) {
    return 'Email này đã được đăng ký trước bằng Mật khẩu. Vui lòng nhập mật khẩu hoặc liên kết tài khoản.';
  }

  if (errStr === 'bad_oauth_callback' || descStr.includes('state parameter missing')) {
    return 'Phiên xác thực chuyển hướng bị gián đoạn hoặc hết hạn. Vui lòng bấm đăng nhập lại.';
  }

  if (errStr === 'unauthorized_client' || descStr.includes('unauthorized')) {
    return 'Cấu hình ứng dụng Google OAuth chưa cho phép miền web này. Vui lòng liên hệ quản trị viên.';
  }

  return description || error || 'Lỗi kết nối khi xác thực tài khoản Google.';
}

/**
 * Dọn dẹp các tham số code, error, state trên thanh địa chỉ URL sau khi đã bóc tách xong
 */
export function cleanOAuthUrl(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');

    // Giữ nguyên path, làm sạch hash nếu hash chứa access_token/error
    let newHash = window.location.hash;
    if (newHash.includes('access_token') || newHash.includes('error')) {
      newHash = '';
    }

    const cleanPath = url.pathname + (url.search ? url.search : '') + newHash;
    window.history.replaceState(window.history.state, '', cleanPath || '/');
  } catch (err) {
    console.warn('Không thể dọn dẹp URL:', err);
  }
}
