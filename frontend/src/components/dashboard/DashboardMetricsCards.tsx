import React from 'react';
import { Users, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardMetricsCardsProps {
  totalCount: number;
  processingCount: number;
  passedCount: number;
  rejectedCount: number;
}

export const DashboardMetricsCards: React.FC<DashboardMetricsCardsProps> = ({
  totalCount,
  processingCount,
  passedCount,
  rejectedCount,
}) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: Tổng CV */}
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-[#2D323F] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Tổng CV</span>
          <Users className="w-4 h-4 text-slate-400" />
        </div>
        <div className="mt-2.5 sm:mt-3">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatNumber(totalCount)}
          </span>
        </div>
        <div className="mt-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#212530] text-slate-200 border border-slate-700/50">
            Hệ thống
          </span>
        </div>
      </div>

      {/* Card 2: Đang xử lý */}
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-[#60A5FA]/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Đang xử lý</span>
          <Loader2 className="w-4 h-4 text-[#60A5FA] animate-spin" />
        </div>
        <div className="mt-2.5 sm:mt-3">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatNumber(processingCount)}
          </span>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1E293B] text-[#60A5FA] border border-[#60A5FA]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
            Đang quét
          </span>
        </div>
      </div>

      {/* Card 3: Đạt */}
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-[#34D399]/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Đạt</span>
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
        </div>
        <div className="mt-2.5 sm:mt-3">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatNumber(passedCount)}
          </span>
        </div>
        <div className="mt-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#064E3B] text-[#34D399] border border-[#34D399]/30">
            Phù hợp AI
          </span>
        </div>
      </div>

      {/* Card 4: Từ chối */}
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-[#FB7185]/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Từ chối</span>
          <XCircle className="w-4 h-4 text-[#FB7185]" />
        </div>
        <div className="mt-2.5 sm:mt-3">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatNumber(rejectedCount)}
          </span>
        </div>
        <div className="mt-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#4C0519] text-[#FB7185] italic border border-[#FB7185]/30">
            Chưa đạt
          </span>
        </div>
      </div>
    </div>
  );
};
