import React, { useState } from 'react';
import { X, Mail, Video, Building2, Calendar, MapPin, Send, CheckCircle2, Edit3, RotateCcw, User, MessageSquareText, ExternalLink, AlertTriangle } from 'lucide-react';
import type { MonthlyCandidate } from '../../types';
import { monthlyReportService, type InterviewEmailPayload } from '../../services/monthlyReportService';

interface EmailInviteModalProps {
  candidate: MonthlyCandidate;
  onClose: () => void;
  onSuccess: (updatedCandidate: MonthlyCandidate) => void;
}

export const EmailInviteModal: React.FC<EmailInviteModalProps> = ({
  candidate,
  onClose,
  onSuccess,
}) => {
  const [candidateName, setCandidateName] = useState(candidate.masked_name || 'Ứng viên');
  const [interviewType, setInterviewType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [candidateEmail, setCandidateEmail] = useState(candidate.email || `${(candidate.masked_name || 'ungvien').toLowerCase().replace(/\s+/g, '')}@gmail.com`);
  const [interviewTime, setInterviewTime] = useState('09:30 AM, Ngày mai');
  const [location, setLocation] = useState('https://meet.google.com/rec-interview-room');
  const [interviewerName, setInterviewerName] = useState('Ban Tuyển dụng & Phát triển Nhân sự');
  const [customNotes, setCustomNotes] = useState('Vui lòng tham gia đúng giờ và chuẩn bị portfolio dự án gần nhất.');
  
  const [emailSubject, setEmailSubject] = useState(
    `[THƯ MỜI PHỎNG VẤN] - Vị trí ${candidate.job_title || 'Tuyển Dụng'} - ${candidate.masked_name || 'Ứng viên'}`
  );

  const generateStandardTemplate = (
    name: string,
    type: 'ONLINE' | 'OFFLINE',
    time: string,
    loc: string,
    interviewer: string,
    notes: string,
    jobTitle?: string
  ) => {
    const typeLabel = type === 'ONLINE' ? 'Online qua Google Meet / Teams' : 'Trực tiếp tại Trụ sở Doanh nghiệp';
    const posLabel = jobTitle ? `vị trí ${jobTitle}` : 'vị trí ứng tuyển';
    return `Kính gửi Anh/Chị ${name},

Lời đầu tiên, Ban Tuyển dụng xin gửi lời cảm ơn Anh/Chị đã dành thời gian quan tâm và nộp hồ sơ ứng tuyển vào ${posLabel}.

Sau khi Hội đồng thẩm định và xem xét chi tiết hồ sơ CV năng lực, chúng tôi đánh giá cao kinh nghiệm cũng như tiềm năng của Anh/Chị và trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn chính thức:

• Vị trí ứng tuyển: ${jobTitle || 'Theo hồ sơ ứng tuyển'}
• Hình thức phỏng vấn: ${typeLabel}
• Thời gian phỏng vấn: ${time}
• Địa điểm / Link phòng họp: ${loc}
• Hội đồng phỏng vấn: ${interviewer}
${notes ? `• Ghi chú / Chuẩn bị: ${notes}\n` : ''}
Anh/Chị vui lòng phản hồi (Reply) lại email này để xác nhận tham dự. Nếu có bất kỳ điều chỉnh nào về khung thời gian, xin vui lòng thông báo sớm cho chúng tôi.

Chúc Anh/Chị có một buổi phỏng vấn thành công tốt đẹp!

Trân trọng,
${interviewer}
Bộ phận Nhân sự & Tuyển dụng`;
  };

  const [emailBody, setEmailBody] = useState(
    generateStandardTemplate(
      candidate.masked_name || 'Ứng viên',
      'ONLINE',
      '09:30 AM, Ngày mai',
      'https://meet.google.com/rec-interview-room',
      'Ban Tuyển dụng & Phát triển Nhân sự',
      'Vui lòng tham gia đúng giờ và chuẩn bị portfolio dự án gần nhất.',
      candidate.job_title
    )
  );

  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTypeChange = (type: 'ONLINE' | 'OFFLINE') => {
    setInterviewType(type);
    const newLoc = type === 'ONLINE'
      ? 'https://meet.google.com/rec-interview-room'
      : 'Tầng 8, Tòa nhà Văn phòng Doanh nghiệp, 123 Nguyễn Huệ, Q.1, TP.HCM';
    setLocation(newLoc);
    setEmailBody(generateStandardTemplate(candidateName, type, interviewTime, newLoc, interviewerName, customNotes, candidate.job_title));
  };

  const handleResetTemplate = () => {
    setEmailBody(generateStandardTemplate(candidateName, interviewType, interviewTime, location, interviewerName, customNotes, candidate.job_title));
  };

  // Mở tab Gmail gửi trực tiếp với 1-Click (100% không bao giờ lỗi do port cloud)
  const handleOpenGmailDirect = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      const payload: InterviewEmailPayload = {
        candidate_email: candidateEmail,
        candidate_name: candidateName,
        interview_type: interviewType,
        interview_time: interviewTime,
        interview_location: location,
        interviewer_name: interviewerName,
        custom_notes: customNotes,
        email_subject: emailSubject,
        email_body: emailBody,
      };

      // Lưu thông tin vào database hệ thống
      await monthlyReportService.scheduleInterviewOnly(candidate.id, payload);

      // Mở Gmail compose tab điền sẵn toàn bộ trường
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candidateEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank');

      setSentSuccess(true);
      setStatusMessage(`Đã phê duyệt ứng viên và mở thư mục soạn thảo Gmail gửi tới ${candidateEmail}!`);
      setTimeout(() => {
        onSuccess({
          ...candidate,
          masked_name: candidateName,
          email: candidateEmail,
          approval_status: 'APPROVED',
          interview_type: interviewType,
          interview_time: interviewTime,
          interview_location: location,
          reviewed_by: interviewerName,
        });
      }, 1200);
    } catch (err) {
      console.error('Lỗi lưu phỏng vấn:', err);
      setErrorMessage('Không thể lưu thông tin vào hệ thống. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setIsSending(false);
    }
  };

  // Gửi tự động qua Hệ thống API Backend
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setErrorMessage(null);
    try {
      const payload: InterviewEmailPayload = {
        candidate_email: candidateEmail,
        candidate_name: candidateName,
        interview_type: interviewType,
        interview_time: interviewTime,
        interview_location: location,
        interviewer_name: interviewerName,
        custom_notes: customNotes,
        email_subject: emailSubject,
        email_body: emailBody,
      };

      const result = await monthlyReportService.sendInterviewEmail(candidate.id, payload);
      if (result.success) {
        setSentSuccess(true);
        setStatusMessage(result.message || `Đã gửi thư mời phỏng vấn thành công tới ${candidateEmail}!`);
        setTimeout(() => {
          onSuccess({
            ...candidate,
            masked_name: candidateName,
            email: candidateEmail,
            approval_status: 'APPROVED',
            interview_type: interviewType,
            interview_time: interviewTime,
            interview_location: location,
            reviewed_by: interviewerName,
          });
        }, 1200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      console.error('Lỗi gửi mail phỏng vấn:', err);
      setErrorMessage('Không thể gửi tự động qua Cloud. Bạn có thể sử dụng nút "Mở Gmail gửi ngay (1-Click)" bên dưới!');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Soạn & Gửi Thư Mời Phỏng Vấn
              </h2>
              <p className="text-xs text-slate-400">
                Gửi trực tiếp đến ứng viên <strong className="text-cyan-300">{candidateName}</strong> • {candidate.job_title || 'Vị trí chung'}
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

        {sentSuccess ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-bold text-white">Xử Lý Hoàn Tất!</h3>
            <p className="text-sm text-slate-300 max-w-md">
              {statusMessage || `Hệ thống đã phê duyệt hồ sơ và chuyển thư mời phỏng vấn đến hòm thư ${candidateEmail}.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Warning / Error notice banner with 1-Click fallback */}
            {errorMessage && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Lưu ý gửi thư: </span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGmailDirect}
                  disabled={isSending}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Gmail gửi ngay</span>
                </button>
              </div>
            )}

            {/* Candidate Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Tên hiển thị của Ứng viên:
                </label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setCandidateName(newName);
                    setEmailSubject(`[THƯ MỜI PHỎNG VẤN] - Vị trí ${candidate.job_title || 'Tuyển Dụng'} - ${newName}`);
                  }}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  Email nhận thư mời:
                </label>
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="ungvien@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Choose Format: Online or Offline */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Hình thức phỏng vấn:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange('ONLINE')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    interviewType === 'ONLINE'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Video className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-xs">Phỏng vấn Online</div>
                    <div className="text-[10px] text-slate-400">Google Meet / Teams / Zoom</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('OFFLINE')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    interviewType === 'OFFLINE'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-xs">Phỏng vấn Trực tiếp</div>
                    <div className="text-[10px] text-slate-400">Tại Trụ sở Doanh nghiệp</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Time & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Thời gian phỏng vấn:
                </label>
                <input
                  type="text"
                  required
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  placeholder="09:30 AM, 28/09/2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {interviewType === 'ONLINE' ? 'Link phòng họp:' : 'Địa điểm phỏng vấn:'}
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={interviewType === 'ONLINE' ? 'https://meet.google.com/...' : 'Địa chỉ trụ sở...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Interviewer Name & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Hội đồng / Người thẩm định:
                </label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="Ban Tuyển dụng..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-cyan-400" />
                  Ghi chú chuẩn bị:
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Vui lòng mang theo CV bản cứng..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                Tiêu đề Thư (Email Subject):
              </label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Editable Email Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  Nội dung Thư mời (Bạn có thể gõ sửa trực tiếp):
                </label>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all"
                  title="Điền lại mẫu chuẩn với các thông số bên trên"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Điền lại mẫu chuẩn</span>
                </button>
              </div>
              <textarea
                rows={11}
                required
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 leading-relaxed shadow-inner"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Khuyên dùng: Chọn <strong>Mở Gmail gửi ngay</strong> để gửi trực tiếp 100% chuẩn xác.</span>
              </div>
              
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleOpenGmailDirect}
                  disabled={isSending}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Mở trực tiếp Gmail với đầy đủ thông tin đã soạn để gửi ngay lập tức"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Gmail gửi ngay (1-Click)</span>
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Gửi tự động qua API máy chủ"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Đang gửi...' : 'Gửi tự động (API)'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

