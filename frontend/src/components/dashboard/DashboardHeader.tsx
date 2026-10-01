import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface DashboardHeaderProps {
  jobTitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ jobTitle }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#242834]/80">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1E293B] text-[#60A5FA] border border-[#60A5FA]/30 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#60A5FA]" />
            AI Recruitment Screening Assistant
          </span>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#064E3B] text-[#34D399] border border-[#34D399]/30 items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Human-in-the-loop
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <span>Bảng Điều Khiển Tuyển Dụng AI</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Tự động tiếp nhận hồ sơ và phân tích ứng viên theo yêu cầu tuyển dụng
          {jobTitle && (
            <span>
              {' '}— Vị trí đang xem: <strong className="text-white underline decoration-[#60A5FA] decoration-2 underline-offset-4">{jobTitle}</strong>
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
        <div className="px-3 py-1.5 rounded-xl bg-[#161922] border border-[#242834] text-[11px] text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
          <span>Hệ thống AI sẵn sàng phân tích</span>
        </div>
      </div>
    </div>
  );
};
