import React, { useState } from 'react';
import {
  X, Video, Building2, Calendar, MapPin, Send, CheckCircle2,
  AlertTriangle, Users, Clock, AlertCircle
} from 'lucide-react';
import type { MonthlyCandidate } from '../../types';
import { monthlyReportService, type BatchInterviewPayload, type BatchInterviewResult } from '../../services/monthlyReportService';
import type { UserProfile } from '../../services/supabase';
import { isValidEmail, sanitizeEmail } from '../../utils/emailValidator';

interface BatchEmailInviteModalProps {
  candidates: MonthlyCandidate[];
  currentUser?: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchEmailInviteModal: React.FC<BatchEmailInviteModalProps> = ({
  candidates,
  currentUser,
  onClose,
  onSuccess,
}) => {
  // Quản lý email của từng ứng viên (cho phép HR chỉnh sửa inline nếu email ban đầu bị lỗi như chỉ có MSSV/SĐT)
  const [candidateEmails, setCandidateEmails] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    candidates.forEach((c) => {
      initial[c.id] = c.email || '';
    });
    return initial;
  });

  const [interviewType, setInterviewType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [interviewTime, setInterviewTime] = useState('09:30 AM, Ngày mai');
  const [location, setLocation] = useState('https://meet.google.com/rec-interview-room');
  const [interviewerName, setInterviewerName] = useState(
    currentUser?.full_name ? `${currentUser.full_name} (Ban Tuyển dụng)` : 'Ban Tuyển dụng & Phát triển Nhân sự'
  );
  const [customNotes, setCustomNotes] = useState('Vui lòng tham gia đúng giờ và chuẩn bị portfolio dự án gần nhất.');

  const [isSending, setIsSending] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [batchResult, setBatchResult] = useState<BatchInterviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTypeChange = (type: 'ONLINE' | 'OFFLINE') => {
    setInterviewType(type);
    setLocation(
      type === 'ONLINE'
        ? 'https://meet.google.com/rec-interview-room'
        : 'Tầng 8, Tòa nhà Văn phòng Doanh nghiệp, 123 Nguyễn Huệ, Q.1, TP.HCM'
    );
  };

  const handleEmailChange = (id: string, newEmail: string) => {
    setCandidateEmails((prev) => ({
      ...prev,
      [id]: newEmail,
    }));
  };

  // Kiểm tra xem có bao nhiêu email hợp lệ và chưa hợp lệ
  const invalidCandidates = candidates.filter((c) => !isValidEmail(candidateEmails[c.id]));

  const handleBatchSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser?.role === 'PENDING') {
      alert(`Tài khoản (${currentUser.email}) hiện đang ở trạng thái 'Chờ Duyệt' trên Supabase. Vui lòng liên hệ Admin đổi ô role từ 'PENDING' thành 'RECRUITER' trên Supabase Dashboard để duyệt quyền gửi thư!`);
      return;
    }

    if (invalidCandidates.length > 0) {
      setErrorMessage(`Có ${invalidCandidates.length} ứng viên có email chưa đúng định dạng (thiếu @ hoặc tên miền). Vui lòng cập nhật đầy đủ trước khi gửi!`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setProgressText(`Đang kết nối Webhook HTTPS gửi thư lần lượt tới ${candidates.length} ứng viên...`);

    try {
      const payload: BatchInterviewPayload = {
        candidates: candidates.map((c) => ({
          candidate_id: c.id,
          candidate_name: c.masked_name || 'Ứng viên',
          candidate_email: sanitizeEmail(candidateEmails[c.id]),
        })),
        interview_type: interviewType,
        interview_time: interviewTime,
        interview_location: location,
        interviewer_name: interviewerName,
        custom_notes: customNotes,
        email_subject_template: '[THƯ MỜI PHỎNG VẤN] - Vị trí {job_title} - {name}',
        email_body_template: `Kính gửi Anh/Chị {name},

Lời đầu tiên, Ban Tuyển dụng xin gửi lời cảm ơn Anh/Chị đã dành thời gian quan tâm và nộp hồ sơ ứng tuyển vào vị trí {job_title}.

Sau khi xem xét chi tiết hồ sơ CV năng lực, chúng tôi đánh giá cao kinh nghiệm cũng như tiềm năng chuyên môn của Anh/Chị và trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn chính thức:

--------------------------------------------------
THÔNG TIN PHỎNG VẤN:
• Vị trí ứng tuyển: {job_title}
• Hình thức: ${interviewType === 'ONLINE' ? 'Phỏng vấn Online (Google Meet / Teams)' : 'Phỏng vấn Trực tiếp tại Trụ sở Doanh nghiệp'}
• Thời gian: ${interviewTime}
• Địa điểm / Link họp: ${location}
• Hội đồng phỏng vấn: ${interviewerName}
${customNotes ? `• Ghi chú chuẩn bị: ${customNotes}\n` : ''}--------------------------------------------------

Anh/Chị vui lòng phản hồi (Reply) lại email này để xác nhận tham dự.

Trân trọng,
${interviewerName}
Bộ phận Tuyển dụng & Phát triển Nhân sự`,
      };

      const result = await monthlyReportService.batchSendInterviewEmails(payload);
      setBatchResult(result);
    } catch (err: any) {
      console.error('Lỗi khi gửi email hàng loạt:', err);
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Lỗi kết nối máy chủ gửi email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Gửi Thư Mời Phỏng Vấn Hàng Loạt
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {candidates.length} Ứng viên
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gửi thư ngầm tự động 100% qua Google Webhook HTTPS (Port 443) có giãn cách chống spam.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kết quả sau khi gửi */}
        {batchResult ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Đã Hoàn Tất Gửi Thư Hàng Loạt!</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Gửi thành công: <strong className="text-emerald-400 font-bold">{batchResult.success_count}/{batchResult.total}</strong> ứng viên.
                {batchResult.failure_count > 0 && (
                  <span className="text-rose-400 ml-2">({batchResult.failure_count} ứng viên thất bại)</span>
                )}
              </p>
            </div>

            {/* Chi tiết từng ứng viên */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {batchResult.results.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    r.success
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-white">{r.candidate_name}</span>
                      <span className="text-slate-400 ml-2">({r.email})</span>
                    </div>
                  </div>
                  <span className={r.success ? 'text-emerald-400 font-medium' : 'text-rose-300'}>
                    {r.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
              >
                Xác Nhận & Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBatchSend} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Cảnh báo nếu có email lỗi */}
            {invalidCandidates.length > 0 && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Cảnh báo địa chỉ email: </span>
                  <span>
                    Có {invalidCandidates.length} ứng viên có email chưa đúng định dạng (thiếu @ hoặc tên miền).
                    Vui lòng bấm sửa trực tiếp vào ô email bên dưới để bổ sung (ví dụ: thêm @gmail.com hoặc @domain.edu.vn).
                  </span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Danh sách ứng viên đã chọn & kiểm tra email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Danh Sách Ứng Viên Được Mời ({candidates.length}):
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-800/80">
                {candidates.map((c) => {
                  const currentMail = candidateEmails[c.id] || '';
                  const valid = isValidEmail(currentMail);
                  return (
                    <div key={c.id} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 transition-colors">
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs">{c.masked_name || 'Ứng viên'}</span>
                        <span className="text-[11px] text-slate-400 ml-2">• {c.job_title || 'Vị trí chung'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="text"
                          value={currentMail}
                          onChange={(e) => handleEmailChange(c.id, e.target.value)}
                          placeholder="nhap_email@domain.com"
                          className={`w-56 sm:w-64 px-2.5 py-1 rounded-lg text-xs font-mono border focus:outline-none ${
                            valid
                              ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-cyan-500'
                              : 'bg-rose-950/30 border-rose-500/60 text-rose-200 focus:border-rose-400'
                          }`}
                        />
                        {valid ? (
                          <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                            <AlertCircle className="w-3.5 h-3.5" /> Thiếu @/domain
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thông số lịch phỏng vấn chung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Hình Thức Phỏng Vấn:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('ONLINE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      interviewType === 'ONLINE'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Online (Meet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('OFFLINE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      interviewType === 'OFFLINE'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Trực tiếp (VP)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Thời Gian Phỏng Vấn:
                </label>
                <input
                  type="text"
                  required
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  placeholder="Ví dụ: 09:30 AM, Ngày mai"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Địa Điểm / Link Phòng Họp:
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Hội Đồng Phỏng Vấn:
                </label>
                <input
                  type="text"
                  required
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ghi Chú Chuẩn Bị (Chung):
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Chuẩn bị portfolio, thiết bị âm thanh..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Footer Buttons & Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  {isSending ? progressText : `Sẵn sàng gửi thư cho ${candidates.length} ứng viên qua Webhook HTTPS.`}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSending || invalidCandidates.length > 0 || currentUser?.role === 'PENDING'}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all ${
                    invalidCandidates.length > 0 || currentUser?.role === 'PENDING'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-cyan-500/25 disabled:opacity-50'
                  }`}
                  title={
                    invalidCandidates.length > 0
                      ? 'Vui lòng sửa các email chưa đúng định dạng trước khi gửi'
                      : 'Gửi Thư Mời Cho Tất Cả Ứng Viên Đã Chọn'
                  }
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSending
                      ? 'Đang gửi lần lượt...'
                      : `Gửi Thư Mời (${candidates.length} Ứng Viên)`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
