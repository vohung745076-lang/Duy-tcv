import React from 'react';
import { Bot, UserCheck, ShieldCheck, User, Plus, Upload, Briefcase, SplitSquareVertical, BarChart3, Calendar, RefreshCw } from 'lucide-react';
import type { Job } from '../types';
import type { UserProfile } from '../services/supabase';

interface NavbarProps {
  activeJob: Job | null;
  currentUser: UserProfile;
  onOpenAuth: () => void;
  onOpenCreateJob: () => void;
  onOpenUpload: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeTab: 'jobs' | 'workspace' | 'dashboard' | 'audit' | 'monthly';
  setActiveTab: (tab: 'jobs' | 'workspace' | 'dashboard' | 'audit' | 'monthly') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeJob,
  currentUser,
  onOpenAuth,
  onOpenCreateJob,
  onOpenUpload,
  onRefresh,
  isRefreshing = false,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xl w-full max-w-full">
      {/* TOP ROW: Brand & Quick Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base sm:text-lg text-white tracking-wide bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate">
                Hệ Thống Sàng Lọc CV
              </h1>
              <span className="hidden sm:flex px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 text-cyan-400 border border-blue-500/30 rounded-full items-center gap-1">
                <UserCheck className="w-3 h-3" /> Human-in-the-loop
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 truncate">
              Hệ thống AI hỗ trợ sàng lọc & thẩm định CV minh bạch
            </p>
          </div>
        </div>

        {/* User Role & Action Area */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Supabase User & Role Switcher */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl sm:rounded-2xl transition-all cursor-pointer group text-left"
            title="Nhấn để xem tài khoản Google hoặc đổi vai trò"
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover border border-cyan-500/40"
              />
            ) : (
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                    : currentUser.role === 'PENDING'
                    ? 'bg-amber-600/30 border border-amber-500/40 text-amber-300'
                    : 'bg-blue-600/30 border border-blue-500/40 text-blue-300'
                }`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="block text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[120px]">
                {currentUser.full_name}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                  currentUser.role === 'ADMIN'
                    ? 'text-purple-400 bg-purple-500/10'
                    : currentUser.role === 'PENDING'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-blue-400 bg-blue-500/10'
                }`}
              >
                {currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'PENDING' ? 'Chờ duyệt' : 'HR'}
              </span>
            </div>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-2 sm:px-2.5 py-1.5 sm:py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Làm mới & Đồng bộ dữ liệu mới nhất từ server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          )}

          <button
            onClick={currentUser.role === 'PENDING' ? undefined : onOpenCreateJob}
            disabled={currentUser.role === 'PENDING'}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              currentUser.role === 'PENDING'
                ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={currentUser.role === 'PENDING' ? 'Tài khoản đang chờ duyệt quyền, không thể tạo JD' : 'Tạo Vị trí tuyển dụng mới'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Tạo JD</span>
          </button>

          {activeJob && (
            <button
              onClick={currentUser.role === 'PENDING' ? undefined : onOpenUpload}
              disabled={currentUser.role === 'PENDING'}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentUser.role === 'PENDING'
                  ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
              }`}
              title={currentUser.role === 'PENDING' ? 'Tài khoản đang chờ duyệt quyền, không thể nạp CV' : 'Nạp hồ sơ CV ứng viên'}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nạp Hồ sơ</span>
              <span className="sm:hidden">Nạp CV</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Navigation Tabs (Scrollable on mobile, compact and touch-friendly) */}
      <div className="mt-2 sm:mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Vị trí tuyển dụng (JD)</span>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            disabled={!activeJob}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'workspace'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : !activeJob
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            disabled={!activeJob}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : !activeJob
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Xếp hạng & Funnel</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'monthly'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tổng hợp Nhân sự (Theo Tháng)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
