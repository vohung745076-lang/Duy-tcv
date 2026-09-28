import React, { useState } from 'react';
import { X, MailX, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';
import type { MonthlyCandidate } from '../../types';
import { monthlyReportService } from '../../services/monthlyReportService';
import type { UserProfile } from '../../services/supabase';

interface RejectionEmailModalProps {
  candidate: MonthlyCandidate;
  currentUser?: UserProfile;
  onClose: () => void;
  onSuccess: (updatedCandidate: MonthlyCandidate) => void;
}

const PRESET_REASONS = [
  'Chưa đáp ứng đủ số năm kinh nghiệm thực chiến theo yêu cầu của vị trí',
  'Kỹ năng chuyên môn cốt lõi chưa hoàn toàn tương thích với định hướng dự án hiện tại',
  'Hồ sơ chưa có chứng chỉ chuyên môn bắt buộc theo chuẩn tuyển dụng của doanh nghiệp',
  'Mức lương kỳ vọng vượt quá khung ngân sách tuyển dụng đã được phê duyệt',
  'Đợt tuyển dụng đã chọn đủ chỉ tiêu ứng viên phù hợp với giai đoạn này',
];

export const RejectionEmailModal: React.FC<RejectionEmailModalProps> = ({
  candidate,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [candidateName, setCandidateName] = useState(candidate.masked_name || 'Ứng viên');
  const [candidateEmail, setCandidateEmail] = useState(
    candidate.email || `${(candidate.masked_name || 'ungvien').toLowerCase().replace(/\s+/g, '')}@gmail.com`
  );
  const [jobTitle] = useState(candidate.job_title || 'Vị trí Tuyển dụng');
  const [rejectionReason, setRejectionReason] = useState(
    candidate.rejection_reason || PRESET_REASONS[0]
  );
  const [senderName, setSenderName] = useState(
    currentUser?.full_name ? `${currentUser.full_name} (Ban Tuyển dụng)` : 'Ban Tuyển dụng & Nhân Sự'
  );

  const generateTemplate = (name: string, job: string, reason: string, sender: string) => {
    return `Kính gửi Anh/Chị ${name},

Lời đầu tiên, ${sender} xin gửi lời cảm ơn chân thành đến Anh/Chị vì đã quan tâm và dành thời gian nộp hồ sơ ứng tuyển cho vị trí ${job} tại tổ chức của chúng tôi.

Hội đồng tuyển dụng đã xem xét và đánh giá rất kỹ lưỡng hồ sơ năng lực cũng như kinh nghiệm làm việc của Anh/Chị. Tuy nhiên, do yêu cầu chuyên biệt của đợt tuyển dụng lần này và số lượng hồ sơ lớn, chúng tôi rất tiếc phải thông báo hiện tại chưa thể đồng hành cùng Anh/Chị ở vị trí này.

--------------------------------------------------
THÔNG TIN PHẢN HỒI TỪ HỘI ĐỒNG TUYỂN DỤNG:
• Lý do chưa phù hợp: ${reason}
--------------------------------------------------

Chúng tôi rất trân trọng tiềm năng của Anh/Chị và xin phép được lưu lại thông tin hồ sơ trong hệ thống nguồn nhân tài (Talent Pool) để chủ động liên hệ lại ngay khi có các vị trí mới phù hợp hơn với thế mạnh của Anh/Chị trong tương lai.

Chúc Anh/Chị luôn dồi dào sức khỏe và gặt hái được nhiều thành công trên con đường sự nghiệp sắp tới.

Trân trọng,
${sender}
Bộ phận Tuyển Dụng & Phát Triển Nhân Sự`;
  };

  const [emailSubject, setEmailSubject] = useState(
    `[Thư Cảm Ơn & Phản Hồi Kết Quả] - Vị trí ${candidate.job_title || 'Tuyển Dụng'} | ${candidate.masked_name || 'Ứng viên'}`
  );

  const [emailBody, setEmailBody] = useState(
    generateTemplate(
      candidate.masked_name || 'Ứng viên',
      candidate.job_title || 'Vị trí Tuyển dụng',
      candidate.rejection_reason || PRESET_REASONS[0],
      currentUser?.full_name ? `${currentUser.full_name} (Ban Tuyển dụng)` : 'Ban Tuyển dụng & Nhân Sự'
    )
  );

  const [isSending, setIsSending] = useState(false);

  const handleReasonSelect = (reason: string) => {
    setRejectionReason(reason);
    setEmailBody(generateTemplate(candidateName, jobTitle, reason, senderName));
  };

  const handleResetTemplate = () => {
    setEmailBody(generateTemplate(candidateName, jobTitle, rejectionReason, senderName));
  };

  // Hành động duy nhất: Lưu trạng thái Loại vào Database và mở trực tiếp Gmail với nội dung điền sẵn 100%
  const handleConfirmAndOpenGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Vui lòng chọn hoặc nhập lý do từ chối cụ thể!');
      return;
    }

    setIsSending(true);
    try {
      // 1. Cập nhật trạng thái REJECTED trong cơ sở dữ liệu nội bộ
      await monthlyReportService.updateApprovalStatus(
        candidate.id,
        'REJECTED',
        rejectionReason.trim(),
        senderName,
        false
      );

      // 2. Mở trực tiếp Gmail với email, tiêu đề và nội dung thư từ chối điền sẵn
      const encodedTo = encodeURIComponent(candidateEmail);
      const encodedSubject = encodeURIComponent(emailSubject);
      const encodedBody = encodeURIComponent(emailBody);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;

      const openedWindow = window.open(gmailUrl, '_blank');
      if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
        window.location.href = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
      }

      // 3. Cập nhật giao diện thành công và đóng modal
      onSuccess({
        ...candidate,
        approval_status: 'REJECTED',
        rejection_reason: rejectionReason.trim(),
        reviewed_by: senderName,
      });
    } catch (err: any) {
      console.error('Lỗi khi lưu loại hồ sơ:', err);
      alert('Không thể lưu trạng thái loại: ' + (err?.message || 'Lỗi kết nối'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-rose-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <MailX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thư Cảm Ơn & Phản Hồi Từ Chối Ứng Viên</h2>
              <p className="text-xs text-slate-400">
                Gửi thư phản hồi lịch sự, minh bạch lý do chưa phù hợp cho <strong className="text-rose-300">{candidate.masked_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          <form onSubmit={handleConfirmAndOpenGmail} className="space-y-4">
            {/* Thông tin ứng viên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tên ứng viên:</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    setEmailBody(generateTemplate(e.target.value, jobTitle, rejectionReason, senderName));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email nhận thư:</label>
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-rose-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Preset reasons */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Chọn nhanh lý do chưa phù hợp:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleReasonSelect(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border text-left transition-all cursor-pointer ${
                      rejectionReason === preset
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Chi tiết lý do */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chi tiết lý do phản hồi (sẽ hiển thị trang trọng trong thư):
              </label>
              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setEmailBody(generateTemplate(candidateName, jobTitle, e.target.value, senderName));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Tiêu đề Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tiêu đề Email:
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Soạn thảo nội dung thư */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Nội dung thư gửi ứng viên (Có thể chỉnh sửa):
                </label>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Khôi phục mẫu chuẩn
                </button>
              </div>
              <textarea
                rows={8}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Người gửi */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Chữ ký người gửi:</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => {
                  setSenderName(e.target.value);
                  setEmailBody(generateTemplate(candidateName, jobTitle, rejectionReason, e.target.value));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Nút hành động duy nhất màu xanh */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Mở sẵn Gmail trên trình duyệt để gửi trực tiếp và lưu trạng thái loại vào hệ thống"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{isSending ? 'Đang xử lý...' : 'Mở Gmail gửi ngay (1-Click)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
