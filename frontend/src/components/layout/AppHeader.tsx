import React from 'react';
import { Menu, Plus, Upload, RefreshCw, Briefcase } from 'lucide-react';
import type { Job } from '../../types';
import type { UserProfile } from '../../services/supabase';

interface AppHeaderProps {
  activeJob: Job | null;
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  currentUser: UserProfile | null;
  onOpenCreateJob: () => void;
  onOpenUpload: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleMobileSidebar: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeJob,
  jobs,
  onSelectJob,
  currentUser,
  onOpenCreateJob,
  onOpenUpload,
  onRefresh,
  isRefreshing = false,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 bg-[#161922] border-b border-[#242834] sticky top-0 z-30 flex items-center justify-between gap-3">
      {/* Left Area: Mobile menu & Job selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-[#141720] border border-[#242834]"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Job Dropdown Selector */}
        {jobs.length > 0 && activeJob && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-flex text-xs font-semibold text-slate-400 items-center gap-1.5 shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-[#60A5FA]" /> Vị trí:
            </span>
            <div className="relative">
              <select
                value={activeJob.id}
                onChange={(e) => {
                  const selected = jobs.find((j) => j.id === e.target.value);
                  if (selected) onSelectJob(selected);
                }}
                className="h-9 max-w-[190px] sm:max-w-xs bg-[#141720] border border-[#2D323F] text-xs font-bold text-white rounded-xl px-3 pr-7 focus:outline-none focus:border-[#60A5FA] cursor-pointer truncate"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id} className="bg-[#161922] text-white">
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right Area: Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {currentUser && currentUser.role !== 'PENDING' && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 px-2.5 sm:px-3 bg-[#141720] hover:bg-[#1E293B] text-slate-200 border border-[#242834] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#60A5FA] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        )}

        {currentUser && currentUser.role !== 'PENDING' && (
          <button
            type="button"
            onClick={onOpenCreateJob}
            className="h-9 px-3 sm:px-3.5 bg-[#141720] hover:bg-[#1E293B] text-white border border-[#2D323F] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Tạo Vị trí tuyển dụng mới"
          >
            <Plus className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="hidden sm:inline">Tạo JD</span>
            <span className="sm:hidden">+ JD</span>
          </button>
        )}

        {currentUser && currentUser.role !== 'PENDING' && activeJob && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="h-9 px-3 sm:px-4 bg-[#1E293B] hover:bg-slate-700 text-white border border-[#60A5FA]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Tiếp nhận & Nạp CV ứng viên"
          >
            <Upload className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Nạp CV</span>
          </button>
        )}
      </div>
    </header>
  );
};
