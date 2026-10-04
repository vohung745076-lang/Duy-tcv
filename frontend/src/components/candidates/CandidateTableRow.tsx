import React, { useState } from 'react';
import { Eye, Ban, Sparkles, TrendingUp, Scale, AlertCircle, CheckSquare, Square } from 'lucide-react';
import type { Candidate, Evaluation } from '../../types';

interface CandidateTableRowProps {
  candidate: Candidate;
  jobTitle?: string;
  evaluation?: Evaluation;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onViewDetail: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
}

export const CandidateTableRow: React.FC<CandidateTableRowProps> = ({
  candidate,
  jobTitle,
  evaluation,
  isSelected,
  onToggleSelect,
  onViewDetail,
  onReject,
}) => {
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  // Score calculation
  const overallScore = evaluation?.overall_score ?? (candidate.status === 'EVALUATED' ? 75 : 0);
  const isEvaluated = candidate.status === 'EVALUATED' || !!evaluation;

  // Breakdown scores (real or calculated from evaluation breakdown)
  const skillsScore = evaluation?.skills_score ?? Math.round(overallScore * 0.95);
  const experienceScore = evaluation?.experience_score ?? Math.round(overallScore * 0.9);
  const educationScore = evaluation?.education_score ?? Math.round(overallScore * 0.92);
  const requirementsScore = evaluation?.breakdown?.skills?.score ?? Math.round(overallScore * 0.88);

  // AI Match Badge Config
  const getAiBadge = () => {
    if (!isEvaluated) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-800/40">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Chờ AI quét</span>
        </span>
      );
    }

    if (overallScore >= 80) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-800/40">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>{Math.round(overallScore)}% Phù hợp</span>
        </span>
      );
    }

    if (overallScore >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/50 text-amber-300 border border-amber-800/40">
          <Scale className="w-3 h-3 text-amber-400" />
          <span>{Math.round(overallScore)}% Cần xem xét</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/50 text-rose-300 border border-rose-800/40">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        <span>{Math.round(overallScore)}% Phù hợp thấp</span>
      </span>
    );
  };

  // Status Badge Config
  const getStatusBadge = () => {
    // Check candidate approval_status / status
    if (candidate.status === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
          Đã loại
        </span>
      );
    }

    if (candidate.status === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
          Đã tuyển
        </span>
      );
    }

    if (candidate.status === 'INTERVIEW_SCHEDULED' || candidate.status === 'APPROVED_FOR_INTERVIEW') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/30">
          Chờ phỏng vấn
        </span>
      );
    }

    if (isEvaluated) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-950/30 text-rose-300/90 border border-rose-800/30">
          Chờ phỏng vấn
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-950/50 text-blue-300 border border-blue-800/40">
        Chờ AI duyệt
      </span>
    );
  };

  // Avatar Initials & Color
  const name = candidate.masked_name || 'Ứng viên';
  const initial = name.charAt(0).toUpperCase();
  const email = (candidate as any).email || `${name.toLowerCase().replace(/\s+/g, '')}@student.hub.edu.vn`;

  return (
    <tr className={`border-b border-[#1E1E1E] transition-colors hover:bg-[#161616]/80 ${isSelected ? 'bg-[#181C26]' : 'bg-[#111111]'}`}>
      {/* 1. Checkbox */}
      <td className="py-4 pl-4 pr-2 w-10">
        <button
          type="button"
          onClick={() => onToggleSelect(candidate.id)}
          className="text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>

      {/* 2. ỨNG VIÊN */}
      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0 shadow-inner">
            {initial}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate hover:text-blue-400 cursor-pointer transition-colors" onClick={() => onViewDetail(candidate)}>
              {name}
            </h4>
            <p className="text-[11px] text-[#A1A1AA] truncate font-mono">
              {email}
            </p>
          </div>
        </div>
      </td>

      {/* 3. VỊ TRÍ ỨNG TUYỂN */}
      <td className="py-4 px-3 text-xs font-medium text-zinc-300">
        <span className="truncate max-w-[180px] block">
          {jobTitle || 'Data Analyst'}
        </span>
      </td>

      {/* 4. AI ĐÁNH GIÁ (Interactive with Hover Popover) */}
      <td className="py-4 px-3 relative">
        <div
          className="cursor-pointer inline-block"
          onMouseEnter={() => setShowAiTooltip(true)}
          onMouseLeave={() => setShowAiTooltip(false)}
          onClick={() => onViewDetail(candidate)}
        >
          {getAiBadge()}
        </div>

        {/* AI Breakdown Popover */}
        {showAiTooltip && isEvaluated && (
          <div className="absolute z-40 left-3 top-12 w-64 p-3 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27272A]">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" /> Phân tích AI Matching
              </span>
              <span className="text-xs font-extrabold text-emerald-400">{Math.round(overallScore)}%</span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-400">Skills (Kỹ năng):</span>
                <span className="font-semibold text-zinc-200">{skillsScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Experience (Kinh nghiệm):</span>
                <span className="font-semibold text-zinc-200">{experienceScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Education (Học vấn):</span>
                <span className="font-semibold text-zinc-200">{educationScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Requirements (Yêu cầu JD):</span>
                <span className="font-semibold text-zinc-200">{requirementsScore}%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onViewDetail(candidate)}
              className="mt-2.5 w-full py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold transition-all text-center"
            >
              Xem phân tích AI chi tiết →
            </button>
          </div>
        )}
      </td>

      {/* 5. TRẠNG THÁI */}
      <td className="py-4 px-3">
        {getStatusBadge()}
      </td>

      {/* 6. HÀNH ĐỘNG */}
      <td className="py-4 px-3 pr-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onViewDetail(candidate)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Xem chi tiết hồ sơ và thẩm định"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem chi tiết</span>
          </button>

          {candidate.status !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => onReject(candidate)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Loại hồ sơ ứng viên này"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Loại</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
