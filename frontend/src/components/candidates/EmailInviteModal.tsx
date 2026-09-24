import React, { useState } from 'react';
import { X, Mail, Video, Building2, Calendar, MapPin, Send, CheckCircle2 } from 'lucide-react';
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
  const [interviewType, setInterviewType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [candidateEmail, setCandidateEmail] = useState(candidate.email || `${candidate.masked_name.toLowerCase().replace(/\s+/g, '')}@gmail.com`);
  const [interviewTime, setInterviewTime] = useState('09:30 AM, Ngày mai');
  const [location, setLocation] = useState('https://meet.google.com/rec-interview-room');
  const [interviewerName, setInterviewerName] = useState('Bộ phận Tuyển dụng Nhân sự');
  const [customNotes, setCustomNotes] = useState('Vui lòng tham gia đúng giờ và chuẩn bị portfolio dự án gần nhất.');
  
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleTypeChange = (type: 'ONLINE' | 'OFFLINE') => {
    setInterviewType(type);
    if (type === 'ONLINE') {
      setLocation('https://meet.google.com/rec-interview-room');
    } else {
      setLocation('Tầng 8, Tòa nhà Văn phòng Doanh nghiệp, 123 Nguyễn Huệ, Q.1, TP.HCM');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const payload: InterviewEmailPayload = {
        candidate_email: candidateEmail,
        candidate_name: candidate.masked_name,
        interview_type: interviewType,
        interview_time: interviewTime,
        interview_location: location,
        interviewer_name: interviewerName,
        custom_notes: customNotes,
      };

      await monthlyReportService.sendInterviewEmail(candidate.id, payload);
      setSentSuccess(true);
      setTimeout(() => {
        onSuccess({
          ...candidate,
          email: candidateEmail,
          approval_status: 'APPROVED',
          interview_type: interviewType,
          interview_time: interviewTime,
          interview_location: location,
          reviewed_by: interviewerName,
        });
      }, 1200);
    } catch (err) {
      console.error('Lỗi gửi mail phỏng vấn:', err);
      alert('Không thể gửi email. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Phê duyệt & Gửi Email Mời Phỏng vấn
              </h2>
              <p className="text-xs text-slate-400">
                Gửi thông báo phỏng vấn trực tiếp đến ứng viên <strong className="text-cyan-300">{candidate.masked_name}</strong>
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
            <h3 className="text-lg font-bold text-white">Đã Gửi Email Thành Công!</h3>
            <p className="text-sm text-slate-300 max-w-md">
              Hệ thống đã phê duyệt hồ sơ và chuyển thư mời phỏng vấn tự động đến hòm thư <strong className="text-cyan-400">{candidateEmail}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
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
                    <div className="text-[10px] text-slate-400">Tại Trụ sở Công ty</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Candidate Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Ứng viên nhận thư:</label>
              <input
                type="email"
                required
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="ungvien@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Time & Date */}
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

            {/* Interviewer name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Người thẩm định / Hội đồng phỏng vấn:</label>
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi chú kèm theo cho ứng viên:</label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Email Preview */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Xem trước nội dung email tự động:</span>
              <div className="text-[11px] text-slate-300 font-mono space-y-1 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                {`Kính gửi Anh/Chị ${candidate.masked_name},\n\nBan Tuyển dụng trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn:\n- Hình thức: ${interviewType === 'ONLINE' ? 'Online qua Google Meet / Teams' : 'Trực tiếp tại Trụ sở'}\n- Thời gian: ${interviewTime}\n- Địa điểm/Link: ${location}\n- Thành phần: ${interviewerName}\n\nTrân trọng,\n${interviewerName}`}
              </div>
            </div>

            {/* Footer Buttons */}
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
                disabled={isSending}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Đang gửi email...' : 'Gửi Email Phỏng vấn & Duyệt'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
