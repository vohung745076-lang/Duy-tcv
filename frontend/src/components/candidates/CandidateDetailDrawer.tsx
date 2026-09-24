import React from 'react';
import { X, User, Calendar, CheckCircle2, XCircle, Mail, MapPin, Video, Building2, Clock, Sparkles } from 'lucide-react';
import type { MonthlyCandidate } from '../../types';

interface CandidateDetailDrawerProps {
  candidate: MonthlyCandidate;
  onClose: () => void;
  onApprove: (candidate: MonthlyCandidate) => void;
  onReject: (candidate: MonthlyCandidate) => void;
}

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  candidate,
  onClose,
  onApprove,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-lg">
              {candidate.masked_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">{candidate.masked_name}</h2>
                {candidate.approval_status === 'APPROVED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã duyệt phỏng vấn
                  </span>
                )}
                {candidate.approval_status === 'REJECTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Đã bị loại
                  </span>
                )}
                {candidate.approval_status === 'PENDING' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Chờ HR phê duyệt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vị trí: <strong className="text-slate-300">{candidate.job_title || 'Kho hồ sơ lưu trữ chung'}</strong> • File: {candidate.original_filename}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Audit: Who reviewed */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Người/Hệ thống đã kiểm tra:</span>
              <strong className="text-cyan-300 font-semibold">{candidate.reviewed_by || 'Hệ thống AI & HR'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">Thời gian nộp:</span>
              <strong className="text-slate-200">{new Date(candidate.created_at).toLocaleDateString('vi-VN')}</strong>
            </div>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-center">
              <div className="text-[10px] text-blue-300 font-semibold mb-1">Điểm Tổng AI</div>
              <div className="text-base sm:text-xl font-black text-blue-400">{Math.round(candidate.overall_score || 0)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-center">
              <div className="text-[10px] text-cyan-300 font-semibold mb-1">Kỹ năng</div>
              <div className="text-base sm:text-xl font-black text-cyan-400">{Math.round(candidate.skills_score || 0)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-center">
              <div className="text-[10px] text-purple-300 font-semibold mb-1">Kinh nghiệm</div>
              <div className="text-base sm:text-xl font-black text-purple-400">{Math.round(candidate.experience_score || 0)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center">
              <div className="text-[10px] text-emerald-300 font-semibold mb-1">Học vấn</div>
              <div className="text-base sm:text-xl font-black text-emerald-400">{Math.round(candidate.education_score || 0)}</div>
            </div>
          </div>

          {/* If Approved with Interview Info */}
          {candidate.approval_status === 'APPROVED' && candidate.interview_time && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> Thông tin Lịch Phỏng vấn đã gửi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  {candidate.interview_type === 'ONLINE' ? <Video className="w-4 h-4 text-blue-400" /> : <Building2 className="w-4 h-4 text-purple-400" />}
                  <span>Hình thức: <strong>{candidate.interview_type === 'ONLINE' ? 'Online (Meet/Teams)' : 'Trực tiếp tại trụ sở'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Thời gian: <strong>{candidate.interview_time}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Địa điểm / Link: <strong className="text-cyan-300 break-all">{candidate.interview_location}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* If Rejected with Reason */}
          {candidate.approval_status === 'REJECTED' && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <XCircle className="w-4 h-4" /> Lý do bị loại (Lưu vết nhân sự)
              </div>
              <p className="text-xs text-rose-200 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 leading-relaxed">
                {candidate.rejection_reason || 'Chưa cập nhật lý do chi tiết.'}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {candidate.ai_summary && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Nhận định & Đánh giá của AI
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {candidate.ai_summary}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Email: <strong className="text-slate-200">{candidate.email}</strong>
          </div>
          <div className="flex items-center gap-2">
            {candidate.approval_status !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => onReject(candidate)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
              >
                Loại Hồ sơ
              </button>
            )}
            <button
              type="button"
              onClick={() => onApprove(candidate)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Phê duyệt & Gửi Mail Phỏng vấn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
