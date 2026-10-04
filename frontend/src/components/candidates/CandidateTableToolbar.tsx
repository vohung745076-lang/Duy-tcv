import React from 'react';
import { Search, UploadCloud, ChevronDown } from 'lucide-react';
import type { Job } from '../../types';

interface CandidateTableToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  jobs: Job[];
  selectedJobId: string;
  onSelectJobId: (jobId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenUpload: () => void;
}

export const CandidateTableToolbar: React.FC<CandidateTableToolbarProps> = ({
  searchQuery,
  onSearchChange,
  jobs,
  selectedJobId,
  onSelectJobId,
  statusFilter,
  onStatusFilterChange,
  onOpenUpload,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 pb-2">
      {/* Left Search & Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] sm:min-w-[280px] max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm ứng viên, email..."
            className="w-full bg-[#0D0D0D] border border-[#272727] rounded-xl pl-10 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
          />
        </div>

        {/* Job Selection Dropdown */}
        <div className="relative">
          <select
            value={selectedJobId}
            onChange={(e) => onSelectJobId(e.target.value)}
            className="appearance-none bg-[#0D0D0D] border border-[#272727] rounded-xl pl-3.5 pr-8 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-inner"
          >
            <option value="ALL">Chọn vị trí tuyển dụng</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* CV Status Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="appearance-none bg-[#0D0D0D] border border-[#272727] rounded-xl pl-3.5 pr-8 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-inner"
          >
            <option value="ALL">Trạng thái CV</option>
            <option value="PENDING">Chờ phỏng vấn</option>
            <option value="AI_PENDING">Chờ AI duyệt</option>
            <option value="APPROVED">Đã tuyển</option>
            <option value="REJECTED">Đã loại</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Right Primary Action */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 cursor-pointer shrink-0"
        >
          <UploadCloud className="w-4 h-4 text-blue-100" />
          <span>Tải lên CV hàng loạt</span>
        </button>
      </div>
    </div>
  );
};
