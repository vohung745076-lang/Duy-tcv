import React from 'react';
import { Bot, UserCheck, ShieldCheck, User } from 'lucide-react';
import type { Job } from '../types';
import type { UserProfile } from '../services/supabase';

interface NavbarProps {
  activeJob: Job | null;
  currentUser: UserProfile;
  onOpenAuth: () => void;
  onOpenCreateJob: () => void;
  onOpenUpload: () => void;
  activeTab: 'jobs' | 'workspace' | 'dashboard' | 'audit';
  setActiveTab: (tab: 'jobs' | 'workspace' | 'dashboard' | 'audit') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeJob,
  currentUser,
  onOpenAuth,
  onOpenCreateJob,
  onOpenUpload,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 px-6 py-3 shadow-xl">
      <div className="flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-white tracking-wide bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AI CV Screening
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-cyan-400 border border-blue-500/30 rounded-full flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Human-in-the-loop
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Hệ thống AI hỗ trợ sàng lọc & thẩm định CV minh bạch</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vị trí tuyển dụng (JD)
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            disabled={!activeJob}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'workspace'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                : !activeJob
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split-View Workspace
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            disabled={!activeJob}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                : !activeJob
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bảng xếp hạng & Funnel
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Audit Logs
          </button>
        </div>

        {/* User Role & Action Area */}
        <div className="flex items-center gap-3">
          {/* Supabase User & Role Switcher */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer group text-left"
            title="Nhấn để đổi vai trò hoặc đăng nhập Supabase"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              currentUser.role === 'ADMIN'
                ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                : 'bg-blue-600/30 border border-blue-500/40 text-blue-300'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="block text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[130px]">
                {currentUser.full_name}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                currentUser.role === 'ADMIN'
                  ? 'text-purple-400 bg-purple-500/10'
                  : 'text-blue-400 bg-blue-500/10'
              }`}>
                {currentUser.role === 'ADMIN' ? 'Admin Toàn quyền' : 'HR Recruiter'}
              </span>
            </div>
          </button>

          <button
            onClick={onOpenCreateJob}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            + Tạo JD
          </button>

          {activeJob && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              + Nạp Hồ sơ (PDF / Sheet)
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
