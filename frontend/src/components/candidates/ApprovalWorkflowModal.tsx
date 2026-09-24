import React, { useState } from 'react';
import { X, UserX, AlertCircle } from 'lucide-react';
import type { MonthlyCandidate } from '../../types';
import { monthlyReportService } from '../../services/monthlyReportService';

interface ApprovalWorkflowModalProps {
  candidate: MonthlyCandidate;
  onClose: () => void;
  onSuccess: (updatedCandidate: MonthlyCandidate) => void;
}

const PRESET_REASONS = [
  'Chưa đáp ứng đủ số năm kinh nghiệm theo yêu cầu',
  'Kỹ năng chuyên môn cốt lõi chưa phù hợp với vị trí',
  'Mức lương kỳ vọng vượt quá khung ngân sách tuyển dụng',
  'Hồ sơ thiếu bằng cấp hoặc chứng chỉ chuyên môn bắt buộc',
  'Không phản hồi hoặc không tham gia lịch hẹn sơ vấn',
];

export const ApprovalWorkflowModal: React.FC<ApprovalWorkflowModalProps> = ({
  candidate,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState(candidate.rejection_reason || '');
  const [reviewerName, setReviewerName] = useState('Chuyên viên Tuyển dụng (HR)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do từ chối để lưu vết minh bạch!');
      return;
    }

    setIsSubmitting(true);
    try {
      await monthlyReportService.updateApprovalStatus(
        candidate.id,
        'REJECTED',
        reason.trim(),
        reviewerName
      );

      onSuccess({
        ...candidate,
        approval_status: 'REJECTED',
        rejection_reason: reason.trim(),
        reviewed_by: reviewerName,
      });
    } catch (err) {
      console.error('Lỗi khi từ chối ứng viên:', err);
      alert('Không thể lưu trạng thái. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Xác nhận Loại Ứng viên</h2>
              <p className="text-xs text-slate-400">
                Lưu vết lý do không đạt của <strong className="text-rose-300">{candidate.masked_name}</strong>
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Quick preset reasons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Chọn nhanh lý do mẫu:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border text-left transition-all ${
                    reason === preset
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              Chi tiết lý do loại (Ghi vào hệ thống):
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập cụ thể nguyên nhân ứng viên chưa đạt để phục vụ thống kê nhân sự..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Reviewer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Người phê duyệt loại:
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận Loại Hồ sơ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
