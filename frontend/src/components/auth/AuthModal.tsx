import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { supabase, authService, type UserProfile } from '../../services/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'RECRUITER'>('RECRUITER');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN')) {
        try {
          const profile = await authService.fetchOrCreateProfile(session.user);
          onAuthSuccess(profile);
          onClose();
        } catch (err) {
          console.error('Lỗi nạp profile sau khi xác thực:', err);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, onAuthSuccess, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Lỗi khi đăng nhập bằng Google:', err);
      setErrorMessage(err.message || 'Không thể kết nối đến Google OAuth. Vui lòng kiểm tra lại cấu hình.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    alert('Tính năng Tiếp tục với Apple đang được đồng bộ chứng chỉ bảo mật của tổ chức. Vui lòng sử dụng Google hoặc Email.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          const profile = await authService.fetchOrCreateProfile(data.user);
          onAuthSuccess(profile);
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: role,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          if (!data.session) {
            alert('Đăng ký tài khoản thành công! Vui lòng kiểm tra email của bạn để xác thực trước khi đăng nhập.');
            setIsLogin(true);
            return;
          }
          const profile = await authService.fetchOrCreateProfile(data.user);
          onAuthSuccess(profile);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || err?.error_description || (typeof err === 'string' ? err : '');
      if (!msg && typeof err === 'object') {
        try {
          msg = JSON.stringify(err);
          if (msg === '{}') msg = '';
        } catch {
          msg = '';
        }
      }
      if (!msg) {
        msg = 'Đăng nhập hoặc đăng ký thất bại. Vui lòng thử lại.';
      } else if (msg.includes('Error sending confirmation email')) {
        msg = 'Lỗi máy chủ gửi email xác nhận. Vui lòng tắt "Confirm email" trong Supabase Auth Settings hoặc liên hệ quản trị viên.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Email hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, vui lòng bấm "Đăng ký ngay".';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#111111] border border-[#272727] rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-zinc-100 max-h-[90vh] overflow-y-auto relative">
        {/* Subtle Blue Glow Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#272727]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#181818] border border-blue-500/30 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Xác Thực Nhân Sự HR</h3>
              <p className="text-[11px] text-zinc-400">Đăng nhập tài khoản phân quyền RBAC</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1C1C1C] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Federated Sign-In Buttons (Placed ABOVE the divider) */}
        <div className="my-4 space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 px-4 bg-[#161616] hover:bg-[#1E1E1E] active:bg-[#121212] text-zinc-200 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2.5 transition-all border border-[#2A2A2A] hover:border-zinc-500 cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full h-11 px-4 bg-[#161616] hover:bg-[#1E1E1E] active:bg-[#121212] text-zinc-200 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2.5 transition-all border border-[#2A2A2A] hover:border-zinc-500 cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.59.69-1.12 1.84-.98 2.96 1.07.08 2.14-.52 2.79-1.3" />
            </svg>
            <span>Tiếp tục với Apple</span>
          </button>
        </div>

        {/* Sign-in method divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#272727]" />
          </div>
          <div className="relative bg-[#111111] px-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            hoặc
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 mb-4 animate-in fade-in duration-150">
            {errorMessage}
          </div>
        )}

        {/* Native Form Semantics with full Autocomplete Support */}
        <form onSubmit={handleSubmit} method="post" action="#" className="space-y-4 text-xs">
          {!isLogin && (
            <div>
              <label htmlFor="auth-fullname" className="block text-zinc-300 font-semibold mb-1.5">
                Họ và tên *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-fullname"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full h-11 bg-[#0D0D0D] border border-[#272727] rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-zinc-300 font-semibold mb-1.5">
              Email công việc *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                name="username"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full h-11 bg-[#0D0D0D] border border-[#272727] rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-zinc-300 font-semibold mb-1.5">
              Mật khẩu *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-[#0D0D0D] border border-[#272727] rounded-xl pl-10 pr-11 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
              />
              <button
                type="button"
                aria-label="Show password"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-[#1F1F1F] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="auth-role" className="block text-zinc-300 font-semibold mb-1.5">
                Vai trò hệ thống *
              </label>
              <select
                id="auth-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'RECRUITER')}
                className="w-full h-11 bg-[#0D0D0D] border border-[#272727] rounded-xl px-3.5 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner cursor-pointer"
              >
                <option value="RECRUITER">HR Recruiter (Tuyển dụng & Thẩm định CV)</option>
                <option value="ADMIN">Admin (Quản trị hệ thống & Xem Audit Logs)</option>
              </select>
            </div>
          )}

          {/* Native Submit Button: Enter key triggers submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition-all mt-5 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : isLogin ? (
              'Đăng nhập'
            ) : (
              'Tạo tài khoản mới'
            )}
          </button>
        </form>

        {/* Footer switch link */}
        <div className="mt-4 pt-4 border-t border-[#272727] text-center text-xs text-zinc-400">
          {isLogin ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage(null);
                }}
                className="text-blue-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </span>
          ) : (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage(null);
                }}
                className="text-blue-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Đăng nhập
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
