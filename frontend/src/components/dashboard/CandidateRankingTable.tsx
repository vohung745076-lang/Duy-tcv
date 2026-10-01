import React from 'react';
import { ExternalLink, Check, Eye } from 'lucide-react';
import type { CandidateRanking } from '../../types';

interface CandidateRankingTableProps {
  rankings: CandidateRanking[];
  onSelectCandidateToWorkspace: (candidateId: string) => void;
  onApproveCandidate?: (candidateId: string) => void;
  jobTitle?: string;
}

export const CandidateRankingTable: React.FC<CandidateRankingTableProps> = ({
  rankings,
  onSelectCandidateToWorkspace,
  onApproveCandidate,
  jobTitle = 'Chuyên viên',
}) => {
  const formatScore = (score: number) => {
    return `${Math.round(score)}/100`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#34D399]';
    if (score >= 60) return 'text-[#FBBF24]';
    return 'text-[#FB7185]';
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Vừa xong';
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return '1 giờ trước';
    }
  };

  if (rankings.length === 0) {
    return (
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
        Chưa có ứng viên phù hợp với tiêu chí lọc. Hãy thử tìm kiếm từ khóa khác hoặc nạp thêm hồ sơ CV!
      </div>
    );
  }

  return (
    <div className="bg-[#161922] border border-[#242834] rounded-2xl shadow-xl overflow-hidden">
      {/* DESKTOP TABLE VIEW (sm and up) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#242834] text-slate-300 font-semibold bg-[#141720]">
              <th className="py-3.5 px-4">Ứng viên / Vị trí</th>
              <th className="py-3.5 px-4 text-center">Điểm AI</th>
              <th className="py-3.5 px-4 text-center">Trạng thái</th>
              <th className="py-3.5 px-4 text-center">Thời gian</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242834]/80">
            {rankings.map((cand) => {
              const score = cand.final_score;
              const isPassed = score >= 70;
              const isRejected = score < 60;

              return (
                <tr
                  key={cand.candidate_id}
                  className="hover:bg-[#1A1E29] transition-colors group"
                >
                  {/* Cột 1: Ứng viên / Vị trí */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm tracking-tight group-hover:text-[#60A5FA] transition-colors">
                      {cand.masked_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                      {jobTitle || cand.original_filename}
                    </div>
                  </td>

                  {/* Cột 2: Điểm AI */}
                  <td className="py-3.5 px-4 text-center font-bold text-sm">
                    <span className={getScoreColor(score)}>
                      {formatScore(score)}
                    </span>
                    {cand.is_overridden && (
                      <span className="block text-[10px] text-purple-300 font-normal">
                        (HR duyệt)
                      </span>
                    )}
                  </td>

                  {/* Cột 3: Trạng thái Pill */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {isPassed ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#064E3B] text-[#34D399] border border-[#34D399]/30">
                        Phù hợp AI
                      </span>
                    ) : isRejected ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#4C0519] text-[#FB7185] border border-[#FB7185]/30">
                        Từ chối
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1E293B] text-[#FBBF24] border border-[#FBBF24]/30">
                        Đang xem xét
                      </span>
                    )}
                  </td>

                  {/* Cột 4: Thời gian */}
                  <td className="py-3.5 px-4 text-center text-slate-300 font-mono text-[11px] whitespace-nowrap">
                    {formatRelativeTime()}
                  </td>

                  {/* Cột 5: Thao tác (Duyệt & Xem CV) */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onApproveCandidate && (
                        <button
                          type="button"
                          onClick={() => onApproveCandidate(cand.candidate_id)}
                          className="px-3 py-1.5 rounded-xl bg-[#141720] hover:bg-[#1E293B] text-slate-200 hover:text-white border border-[#2D323F] font-semibold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          title="HR Duyệt ứng viên này"
                        >
                          <Check className="w-3.5 h-3.5 text-[#34D399]" />
                          <span>Duyệt</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectCandidateToWorkspace(cand.candidate_id)}
                        className="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#25334A] text-white border border-[#60A5FA]/30 font-semibold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Mở màn hình thẩm định AI và đối chiếu file PDF CV"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Xem CV</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW (< sm) */}
      <div className="sm:hidden divide-y divide-[#242834] p-3 space-y-3">
        {rankings.map((cand) => {
          const score = cand.final_score;
          const isPassed = score >= 70;
          const isRejected = score < 60;

          return (
            <div
              key={cand.candidate_id}
              className="bg-[#141720] border border-[#242834] rounded-xl p-3.5 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm">{cand.masked_name}</h4>
                  <p className="text-[11px] text-slate-400">{jobTitle || cand.original_filename}</p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-black ${getScoreColor(score)}`}>
                    {formatScore(score)}
                  </span>
                  <span className="block text-[10px] text-slate-400">Điểm AI</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#242834]/60">
                <div>
                  {isPassed ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#064E3B] text-[#34D399]">
                      Phù hợp AI
                    </span>
                  ) : isRejected ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4C0519] text-[#FB7185]">
                      Từ chối
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1E293B] text-[#FBBF24]">
                      Đang xem xét
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onApproveCandidate && (
                    <button
                      type="button"
                      onClick={() => onApproveCandidate(cand.candidate_id)}
                      className="px-2.5 py-1 bg-[#161922] text-slate-200 border border-[#2D323F] rounded-lg text-xs font-semibold"
                    >
                      Duyệt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectCandidateToWorkspace(cand.candidate_id)}
                    className="px-3 py-1 bg-[#1E293B] text-white border border-[#60A5FA]/40 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <span>Xem CV</span>
                    <ExternalLink className="w-3 h-3 text-[#60A5FA]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
