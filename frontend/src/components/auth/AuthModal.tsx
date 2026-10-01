import { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-[#161922] border border-[#242834] rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto relative">
        {/* Glow */}
        <div className="absolute -top-14 -right-14 w-32 h-32 bg-[#60A5FA]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242834]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1E293B] border border-[#60A5FA]/40 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Xác Thực Nhân Sự HR</h3>
              <p className="text-[11px] text-slate-400">Đăng nhập tài khoản phân quyền RBAC</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141720] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Social Sign-In Buttons (Nằm TRƯỚC divider "hoặc" theo Section 6) */}
        <div className="my-4 space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#141720] hover:bg-[#1E293B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all border border-[#2D323F] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            className="w-full py-2.5 px-4 bg-[#141720] hover:bg-[#1E293B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all border border-[#2D323F] cursor-pointer"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.59.69-1.12 1.84-.98 2.96 1.07.08 2.14-.52 2.79-1.3" />
            </svg>
            <span>Tiếp tục với Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-3 text-[11px] text-slate-400">
          <div className="flex-1 border-t border-[#242834]"></div>
          <span className="px-3">──────── hoặc ────────</span>
          <div className="flex-1 border-t border-[#242834]"></div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#4C0519]/70 border border-[#FB7185]/40 rounded-xl text-xs text-[#FB7185] mb-4">
            {errorMessage}
          </div>
        )}

        {/* Semantic Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {!isLogin && (
            <div>
              <label htmlFor="auth-fullname" className="block text-slate-200 font-semibold mb-1">
                Họ và tên *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full h-10 bg-[#141720] border border-[#2D323F] rounded-xl pl-9 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#60A5FA]"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-slate-200 font-semibold mb-1">
              Email công việc *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="auth-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full h-10 bg-[#141720] border border-[#2D323F] rounded-xl pl-9 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#60A5FA]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-slate-200 font-semibold mb-1">
              Mật khẩu *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 bg-[#141720] border border-[#2D323F] rounded-xl pl-9 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-[#60A5FA]"
              />
              <button
                type="button"
                aria-label="Hiện mật khẩu"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="auth-role" className="block text-slate-200 font-semibold mb-1">
                Vai trò hệ thống *
              </label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'RECRUITER')}
                className="w-full h-10 bg-[#141720] border border-[#2D323F] rounded-xl px-3 text-white focus:outline-none focus:border-[#60A5FA]"
              >
                <option value="RECRUITER">HR Recruiter (Tuyển dụng & Thẩm định CV)</option>
                <option value="ADMIN">Admin (Quản trị hệ thống & Xem Audit Logs)</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#1E293B] hover:bg-slate-700 text-white border border-[#60A5FA]/40 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all mt-4 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Đang xác thực...' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản mới'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#242834] text-center text-xs text-slate-400">
          {isLogin ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-[#60A5FA] font-bold hover:underline ml-1 cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </span>
          ) : (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-[#60A5FA] font-bold hover:underline ml-1 cursor-pointer"
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
