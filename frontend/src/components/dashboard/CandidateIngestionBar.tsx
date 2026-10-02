import React, { useState } from 'react';
import { Sparkles, Link2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { candidateApi } from '../../services/api';
import type { GoogleSyncResult } from '../../types';

interface CandidateIngestionBarProps {
  jobId: string;
  onSyncCompleted: (result: GoogleSyncResult) => void;
}

export const CandidateIngestionBar: React.FC<CandidateIngestionBarProps> = ({
  jobId,
  onSyncCompleted,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      // Luôn kích hoạt autoEvaluate = true khi bấm nút 'Ai quét CV'
      const result = await candidateApi.syncGoogleSheet(jobId, url.trim(), true);
      
      let msg = result.message;
      if (!msg) {
        if (result.newly_imported > 0) {
          msg = `Đã tiếp nhận và tải về ${result.newly_imported} CV. Hệ thống AI đang tự động thẩm định và đưa vào danh sách HR xem xét.`;
        } else if (result.duplicates_skipped > 0) {
          msg = `Đã đối soát: ${result.duplicates_skipped} hồ sơ đã tồn tại sẵn trong hệ thống.`;
        } else {
          msg = 'Đã quét xong liên kết Google Sheet.';
        }
      }

      setFeedback({
        type: 'success',
        message: msg,
      });
      setUrl('');
      onSyncCompleted(result);
    } catch (err: any) {
      console.error('Lỗi khi kích hoạt AI quét CV:', err);
      const detail = err?.response?.data?.detail;
      setFeedback({
        type: 'error',
        message: detail || 'Không thể đồng bộ nguồn dữ liệu. Vui lòng kiểm tra lại quyền truy cập hoặc định dạng liên kết.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-3">
      {/* Background Accent glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#60A5FA]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Label section */}
      <div className="flex items-center justify-between">
        <label htmlFor="cv-ingestion-input" className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 cursor-pointer">
          <Link2 className="w-4 h-4 text-[#60A5FA]" />
          <span>Tiếp nhận hồ sơ ứng viên</span>
        </label>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Hỗ trợ Google Docs / Sheets chứa danh sách CV & link Google Drive
        </span>
      </div>

      {/* Ingestion Capsule Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <input
            id="cv-ingestion-input"
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (feedback) setFeedback(null);
            }}
            placeholder="Dán URL Google Docs / Sheets chứa CV..."
            className="w-full h-11 sm:h-12 bg-[#141720] border border-[#2D323F] rounded-full px-4 sm:px-5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]/50 transition-all font-sans"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="h-11 sm:h-12 px-6 sm:px-8 bg-[#1E293B] hover:bg-slate-700 active:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-full border border-[#2D323F] hover:border-[#60A5FA]/50 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#60A5FA]" />
              <span className="text-white">Đang quét AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#60A5FA]" />
              <span className="text-white">Ai quét CV</span>
            </>
          )}
        </button>
      </form>

      {/* Realtime Feedback Notice */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-[#064E3B]/60 border border-[#34D399]/40 text-[#34D399]'
              : 'bg-[#4C0519]/60 border border-[#FB7185]/40 text-[#FB7185]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
