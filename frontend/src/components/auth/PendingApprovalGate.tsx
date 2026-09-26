import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '../../services/supabase';

interface PendingApprovalGateProps {
  currentUser: UserProfile;
  onRecheck: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export const PendingApprovalGate: React.FC<PendingApprovalGateProps> = ({
  currentUser,
  onRecheck,
  onLogout,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      await onRecheck();
      setStatusMessage('Đã đồng bộ dữ liệu mới nhất từ Supabase.');
    } catch (err: any) {
      setStatusMessage(err?.message || 'Không thể kết nối đến Supabase. Vui lòng thử lại.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow background effects */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 mb-6">
          <Clock className="w-8 h-8 text-slate-950 animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="space-y-3 mb-6">
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-bold uppercase tracking-wider text-[11px] border border-amber-500/30 inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Tài Khoản Đang Chờ Phê Duyệt
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            Vui Lòng Đợi Admin Duyệt Quyền
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Hồ sơ tài khoản của bạn đã được lưu an toàn vào hệ thống. Nhằm bảo mật dữ liệu tuyển dụng và ứng viên nội bộ, các chức năng và dữ liệu chỉ được mở khóa sau khi Quản trị viên kích hoạt trên Supabase.
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Họ và tên:</span>
            <span className="font-semibold text-white">{currentUser.full_name || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Email:</span>
            <span className="font-semibold text-cyan-300 truncate max-w-[240px]">{currentUser.email}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
            <span className="text-slate-400">Trạng thái:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
              Chờ Admin duyệt (PENDING)
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 mb-6 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Đang kiểm tra quyền trên Supabase...' : 'Kiểm Tra Lại Quyền (Làm Mới)'}</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold text-xs border border-slate-700/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất tài khoản này</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-6">
          Gợi ý: Khi Quản trị viên đổi ô <code>role</code> của bạn thành <code>RECRUITER</code> trên Supabase, hãy bấm <strong>Kiểm tra lại quyền</strong> để vào hệ thống ngay.
        </p>
      </div>
    </div>
  );
};
