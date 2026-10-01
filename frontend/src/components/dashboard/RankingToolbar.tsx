import React from 'react';
import { Search, Filter, Briefcase } from 'lucide-react';

interface RankingToolbarProps {
  searchKeyword: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  jobFilter?: string;
  onJobFilterChange?: (val: string) => void;
  availableJobs?: { id: string; title: string }[];
}

export const RankingToolbar: React.FC<RankingToolbarProps> = ({
  searchKeyword,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  jobFilter = 'all',
  onJobFilterChange,
  availableJobs = [],
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tên ứng viên hoặc vị trí..."
          className="w-full h-10 sm:h-11 bg-[#141720] border border-[#2D323F] rounded-xl pl-10 pr-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]/40 transition-all font-sans"
        />
      </div>

      {/* Status Filter Dropdown */}
      <div className="relative sm:w-44 shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full h-10 sm:h-11 bg-[#141720] border border-[#2D323F] text-xs sm:text-sm text-white rounded-xl px-3 pr-8 focus:outline-none focus:border-[#60A5FA] cursor-pointer appearance-none font-medium"
        >
          <option value="all" className="bg-[#161922] text-white">Tất cả trạng thái</option>
          <option value="passed" className="bg-[#161922] text-[#34D399]">Phù hợp AI (≥ 70%)</option>
          <option value="rejected" className="bg-[#161922] text-[#FB7185]">Từ chối (&lt; 60%)</option>
          <option value="review" className="bg-[#161922] text-[#FBBF24]">Đang xem xét (60-69%)</option>
        </select>
        <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
      </div>

      {/* Job Position Filter Dropdown */}
      {onJobFilterChange && availableJobs.length > 0 && (
        <div className="relative sm:w-48 shrink-0">
          <select
            value={jobFilter}
            onChange={(e) => onJobFilterChange(e.target.value)}
            className="w-full h-10 sm:h-11 bg-[#141720] border border-[#2D323F] text-xs sm:text-sm text-white rounded-xl px-3 pr-8 focus:outline-none focus:border-[#60A5FA] cursor-pointer appearance-none font-medium"
          >
            <option value="all" className="bg-[#161922] text-white">Tất cả vị trí</option>
            {availableJobs.map((j) => (
              <option key={j.id} value={j.id} className="bg-[#161922] text-white">
                {j.title}
              </option>
            ))}
          </select>
          <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
        </div>
      )}
    </div>
  );
};
