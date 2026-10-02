/**
 * Tiện ích kiểm tra và chuẩn hóa địa chỉ email người nhận.
 * Đảm bảo 100% không cho phép gửi thư đến số điện thoại, MSSV thiếu tên miền (@domain.com).
 */

const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export const isValidEmail = (email: string | undefined | null): boolean => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 6 || clean.length > 254) return false;
  return EMAIL_REGEX.test(clean);
};

export const sanitizeEmail = (email: string | undefined | null): string => {
  if (!email) return '';
  return email.trim();
};
