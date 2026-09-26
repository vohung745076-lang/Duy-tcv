import React from 'react';
import { Printer, X, CheckCircle2, Sparkles, FileText, UserCheck } from 'lucide-react';
import type { Candidate, Job, Evaluation } from '../../types';
import type { UserProfile } from '../../services/supabase';

interface ExportAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  job: Job;
  evaluation: Evaluation | null;
  currentUser?: UserProfile;
}

export const ExportAuditReportModal: React.FC<ExportAuditReportModalProps> = ({
  isOpen,
  onClose,
  candidate,
  job,
  evaluation,
  currentUser,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const finalScore = evaluation?.hr_override_score ?? evaluation?.overall_score ?? 0;
  const isOverridden = evaluation?.hr_override_score !== undefined && evaluation?.hr_override_score !== null;

  // Extract all matched evidences
  const allEvidences = [
    ...(evaluation?.breakdown?.skills?.evidence || []),
    ...(evaluation?.breakdown?.experience?.evidence || []),
    ...(evaluation?.breakdown?.education?.evidence || []),
  ];
  const matchedEvidences = allEvidences.filter((e) => e.matched);

  const additionalHighlights = evaluation?.breakdown?.additional_highlights || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      {/* Container - on print this will take full page */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:w-full print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Xem Trước & Xuất Báo Cáo Đối Soát CV (PDF)</h3>
              <p className="text-[11px] text-slate-400">Định dạng chuẩn A4 có chữ ký đối soát dùng cho lưu trữ và phỏng vấn</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Biên Bản / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div
          id="audit-dossier-printable"
          className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-800 font-sans print:p-0 print:overflow-visible print:text-black"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] tracking-wider uppercase font-bold text-slate-500">
                  HỆ THỐNG TUYỂN DỤNG & ĐỐI SOÁT CV THÔNG MINH
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase">
                  BIÊN BẢN ĐỐI SOÁT & THẨM ĐỊNH HỒ SƠ ỨNG VIÊN
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Vị trí: <strong>{job.title}</strong> {job.department ? `(Khối/Phòng: ${job.department})` : ''}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono">
                <div>Mã hồ sơ: #{candidate.id.slice(0, 8).toUpperCase()}</div>
                <div>Ngày xuất: {currentDate}</div>
                <div>Người lập: {currentUser?.email || 'Chuyên viên Tuyển dụng'}</div>
              </div>
            </div>
          </div>

          {/* Candidate General Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-500 block">Ứng viên:</span>
              <strong className="text-slate-900 text-sm">{candidate.masked_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tệp hồ sơ:</span>
              <span className="text-slate-700 font-mono text-[11px] truncate block" title={candidate.original_filename}>
                {candidate.original_filename}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Điểm thẩm định:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-base font-black ${finalScore >= 70 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {finalScore}%
                </span>
                {isOverridden && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                    HR điều chỉnh (Gốc {evaluation?.overall_score}%)
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block">Đánh giá chung:</span>
              <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] mt-0.5 ${
                finalScore >= 75 ? 'bg-emerald-100 text-emerald-800' : finalScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {finalScore >= 75 ? 'PHÙ HỢP - MỜI PHỎNG VẤN' : finalScore >= 50 ? 'CẦN KIỂM CHỨNG THÊM' : 'CHƯA ĐẠT YÊU CẦU'}
              </span>
            </div>
          </div>

          {/* HR Override Reason Note (if any) */}
          {isOverridden && evaluation?.hr_override_reason && (
            <div className="mb-6 p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900">
              <strong>Ghi chú điều chỉnh từ Hội đồng HR:</strong> {evaluation.hr_override_reason}
            </div>
          )}

          {/* AI Executive Summary */}
          {evaluation?.ai_summary && (
            <div className="mb-6">
              <h2 className="text-xs uppercase font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                1. Tóm tắt năng lực & Kết quả đối chiếu AI
              </h2>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
                {evaluation.ai_summary}
              </p>
            </div>
          )}

          {/* Section 2: Matched JD Criteria (Green) */}
          <div className="mb-6">
            <h2 className="text-xs uppercase font-bold text-emerald-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                2. Tiêu chí đáp ứng yêu cầu công việc ({matchedEvidences.length} tiêu chí khớp)
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Khoanh vùng Xanh Lá trên CV
              </span>
            </h2>

            {matchedEvidences.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                Không tìm thấy bằng chứng khớp rõ ràng với tiêu chí JD trong nội dung văn bản.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/70 border-b border-slate-200 text-emerald-950 font-bold">
                      <th className="p-2.5 w-1/4">Tiêu chí JD</th>
                      <th className="p-2.5 w-16 text-center">Mức độ</th>
                      <th className="p-2.5 w-1/3">Dẫn chứng trích xuất từ CV</th>
                      <th className="p-2.5">Nhận định & Thẩm định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {matchedEvidences.map((ev, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-2.5 font-semibold text-slate-800 align-top">
                          {ev.criterion}
                        </td>
                        <td className="p-2.5 text-center font-bold text-emerald-700 align-top">
                          {ev.score}%
                        </td>
                        <td className="p-2.5 italic text-slate-700 border-l border-r border-slate-100 align-top bg-emerald-50/20">
                          "{ev.raw_quote || 'Nêu trong nội dung hồ sơ'}"
                        </td>
                        <td className="p-2.5 text-slate-600 align-top">
                          {ev.explanation || 'Đáp ứng tốt yêu cầu theo mô tả.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Extra Skills & HR Manual Highlights (Cyan & Purple) */}
          <div className="mb-6">
            <h2 className="text-xs uppercase font-bold text-purple-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                3. Điểm sáng nổi bật & Kỹ năng ghi nhận bổ sung ({additionalHighlights.length} điểm)
              </span>
              <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                Khoanh vùng Tím (HR) & Xanh Dương (AI) trên CV
              </span>
            </h2>

            {additionalHighlights.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                Chưa có điểm sáng hoặc kỹ năng bổ sung nào được ghi nhận.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-50/70 border-b border-slate-200 text-purple-950 font-bold">
                      <th className="p-2.5 w-1/4">Tên Kỹ năng / Điểm sáng</th>
                      <th className="p-2.5 w-24 text-center">Nguồn ghi nhận</th>
                      <th className="p-2.5 w-1/3">Dẫn chứng trực tiếp từ CV</th>
                      <th className="p-2.5">Giá trị gia tăng cho dự án</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {additionalHighlights.map((hl, idx) => (
                      <tr
                        key={idx}
                        className={hl.is_hr_added ? 'bg-purple-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        <td className="p-2.5 font-semibold text-slate-900 align-top">
                          <div>{hl.title}</div>
                          <span className="text-[10px] font-normal text-slate-500 block">
                            {hl.category}
                          </span>
                        </td>
                        <td className="p-2.5 text-center align-top">
                          {hl.is_hr_added ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              HR ghi nhận
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                              AI phát hiện
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 italic text-slate-700 border-l border-r border-slate-100 align-top bg-purple-50/10">
                          "{hl.raw_quote}"
                        </td>
                        <td className="p-2.5 text-slate-700 align-top">
                          {hl.value_add_analysis || 'Kỹ năng giá trị hỗ trợ công việc.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Recommended Interview Questions */}
          {evaluation?.interview_questions && evaluation.interview_questions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs uppercase font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                4. Gợi ý câu hỏi đào sâu chuyên môn khi phỏng vấn
              </h2>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-2 text-xs">
                {evaluation.interview_questions.map((q, idx) => (
                  <div key={idx} className="pb-2 border-b border-slate-200 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-slate-900">
                      Câu {idx + 1}: {q.question}
                    </p>
                    {(q.reason_to_ask || q.purpose) && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Mục đích: {q.reason_to_ask || q.purpose}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Signature Sign-off Box */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs mt-8 break-inside-avoid">
            <div>
              <div className="font-bold uppercase text-slate-800">CHUYÊN VIÊN TUYỂN DỤNG</div>
              <p className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</p>
              <div className="h-20 sm:h-24"></div>
              <div className="font-semibold text-slate-700">
                {currentUser?.email || '...........................................'}
              </div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-800">TRƯỞNG BỘ PHẬN / HIRING MANAGER</div>
              <p className="text-[11px] text-slate-500 italic">(Duyệt và ký tên)</p>
              <div className="h-20 sm:h-24"></div>
              <div className="font-semibold text-slate-700">
                ...........................................
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
