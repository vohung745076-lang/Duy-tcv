import { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, Mail, User } from 'lucide-react';
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative">
        {/* Glow effect */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Supabase Authentication & RBAC</h3>
              <p className="text-[11px] text-slate-400">Đăng nhập tài khoản phân quyền</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Sign-In Button */}
        <div className="my-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all border border-slate-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Đăng nhập bằng tài khoản Google (Gmail)</span>
          </button>
        </div>

        <div className="flex items-center my-3 text-[11px] text-slate-500">
          <div className="flex-1 border-t border-slate-800"></div>
          <span className="px-2">hoặc đăng nhập bằng Email</span>
          <div className="flex-1 border-t border-slate-800"></div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 mb-4">
            {errorMessage}
          </div>
        )}

        {/* Form Auth */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {!isLogin && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Họ và tên *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Mật khẩu *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Vai trò hệ thống *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'RECRUITER')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="RECRUITER">HR Recruiter (Tuyển dụng & Đánh giá CV)</option>
                <option value="ADMIN">Admin (Quản trị toàn quyền & Xem Audit Logs)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực Supabase...' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản mới'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {isLogin ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-cyan-400 font-semibold hover:underline"
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
                className="text-cyan-400 font-semibold hover:underline"
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
