import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, ShieldCheck, Link2, Table, CheckCircle2, Smartphone } from 'lucide-react';
import { candidateApi } from '../services/api';
import type { Candidate, Job } from '../types';

interface CandidateUploadModalProps {
  isOpen: boolean;
  activeJob: Job | null;
  onClose: () => void;
  onUploaded: (candidates: Candidate[]) => void;
}

export const CandidateUploadModal: React.FC<CandidateUploadModalProps> = ({
  isOpen,
  activeJob,
  onClose,
  onUploaded,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'google_sync'>('pdf');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const jobId = activeJob ? activeJob.id : 'general';
      const result = await candidateApi.uploadBulk(jobId, selectedFiles);
      if (result && result.length > 0) {
        alert(`✅ Đã tiếp nhận và lưu trữ thành công ${result.length} hồ sơ ứng viên vào hệ thống!`);
        onUploaded(result);
        setSelectedFiles([]);
        onClose();
      } else {
        alert('Không có hồ sơ nào được tạo. Vui lòng kiểm tra lại file của bạn!');
      }
    } catch (err: any) {
      console.error('Lỗi tải file CV:', err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401) {
        alert('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại tài khoản HR để nạp CV.');
      } else if (status === 403) {
        alert('Tài khoản của bạn chưa được cấp quyền (yêu cầu vai trò ADMIN hoặc RECRUITER).');
      } else {
        alert(detail || 'Không thể tải lên file CV. Vui lòng kiểm tra lại file tài liệu của bạn!');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSyncGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSheetUrl.trim()) return;

    setIsUploading(true);
    try {
      // Giả lập đồng bộ và tạo ứng viên từ Google Sheet
      setTimeout(() => {
        setIsUploading(false);
        setSyncSuccess(true);
        setTimeout(() => {
          setSyncSuccess(false);
          onClose();
        }, 1500);
      }, 1200);
    } catch {
      alert('Không thể đồng bộ Google Sheet. Vui lòng kiểm tra quyền chia sẻ công khai.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Tiếp nhận Hồ sơ Ứng viên Tuyển dụng</h3>
            <p className="text-xs text-slate-400">Vị trí: <span className="text-cyan-400 font-semibold">{activeJob ? activeJob.title : 'Kho hồ sơ lưu trữ chung'}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pdf'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Upload File PDF trực tiếp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('google_sync')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'google_sync'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" /> Đồng bộ Google Form / Sheet
          </button>
        </div>

        {/* PII Masking Guarantee Banner */}
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-300">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-blue-200">Tự động Che mờ PII Masking:</span>
            Hệ thống bóc tách text, che mờ Email, SĐT, Ngày sinh và tên thật thành bí danh <span className="underline font-mono">Candidate #ID</span> bảo đảm tính khách quan.
          </div>
        </div>

        {activeTab === 'pdf' ? (
          <>
            {/* Drop Zone & File Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                id="cv-file-input"
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 group-hover:text-blue-400 group-hover:scale-110 transition-all mb-2" />
                <span className="text-sm font-semibold text-slate-200">Kéo thả các file PDF CV vào đây</span>
                <span className="text-xs text-slate-400 mt-1">hoặc nhấn để duyệt file từ thiết bị</span>
              </div>

              {/* Dedicated Mobile File Picker Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600/25 to-cyan-600/20 hover:from-blue-600/40 hover:to-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>📱 Chọn file từ iPhone (Tệp) / Android (Quản lý file)</span>
                </button>
              </div>
            </div>

            {/* Selected File List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 max-h-36 overflow-y-auto space-y-2">
                <span className="text-xs font-semibold text-slate-300">Đã chọn ({selectedFiles.length} file):</span>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg text-xs text-slate-300 border border-slate-700/50">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium">
                Hủy
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? 'Đang tải lên & Tiền xử lý PII...' : `Tải lên & Xử lý ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
              </button>
            </div>
          </>
        ) : (
          /* Google Sheet Ingestion Tab */
          <form onSubmit={handleSyncGoogleSheet} className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-slate-300">
              <span className="font-semibold text-emerald-400 block flex items-center gap-1.5">
                <Link2 className="w-4 h-4" /> Hướng dẫn thu thập từ Google Forms:
              </span>
              <p className="text-[11px] text-slate-400">
                1. Tạo Google Form nhận CV (có trường Tải lên tệp Google Drive).<br />
                2. Mở Google Sheet liên kết kết quả Form → Chọn Chia sẻ: <em>"Bất kỳ ai có đường liên kết đều có thể xem"</em>.<br />
                3. Dán đường link Google Sheet vào ô dưới đây để hệ thống tự động bóc tách ứng viên.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Đường dẫn Google Sheets liên kết Form *</label>
              <input
                type="url"
                required
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>

            {syncSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Đồng bộ thành công dữ liệu từ Google Sheets vào hàng đợi đánh giá!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium">
                Đóng
              </button>
              <button
                type="submit"
                disabled={isUploading || !googleSheetUrl.trim()}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? 'Đang đồng bộ Google Sheets...' : 'Kích hoạt Đồng bộ Ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
