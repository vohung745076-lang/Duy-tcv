import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  Edit3,
  Save,
  RotateCcw,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import type { Job } from '../../types';
import { generateEnterpriseJD } from '../../services/jdGeneratorService';

interface EnterpriseJDModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export const EnterpriseJDModal: React.FC<EnterpriseJDModalProps> = ({
  isOpen,
  onClose,
  job,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [jdContent, setJdContent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (job) {
      // Khởi tạo nội dung JD chuẩn cho công việc
      setJdContent(generateEnterpriseJD(job));
      setIsEditing(false);
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jdContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jdContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bản_JD_Chính_Thức_${job.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để in / lưu file PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bản Mô Tả Công Việc - ${job.title}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif, 'Segoe UI', Tahoma;
              font-size: 13pt;
              line-height: 1.6;
              color: #111827;
              padding: 0;
              margin: 0;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: inherit;
              font-size: 11pt;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 18pt;
              font-weight: bold;
              color: #1e3a8a;
              margin: 0 0 6px 0;
            }
            .subtitle {
              font-size: 11pt;
              color: #4b5563;
              margin: 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              font-size: 9pt;
              color: #6b7280;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">BẢN MÔ TẢ CÔNG VIỆC & TIÊU CHUẨN NĂNG LỰC</h1>
            <p class="subtitle">Dành cho vị trí: ${job.title.toUpperCase()} | Phòng ban: ${job.department || 'Công nghệ'}</p>
          </div>
          <pre>${jdContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <div class="footer">
            Tài liệu lưu hành nội bộ & Cổng tuyển dụng chính thức - Ngày in: ${new Date().toLocaleDateString('vi-VN')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    if (confirm('Khôi phục lại nội dung bản JD chuẩn gốc của hệ thống?')) {
      setJdContent(generateEnterpriseJD(job));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  Bản JD Doanh Nghiệp Chuẩn Hóa
                </h3>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full">
                  Official Specification
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Vị trí: <span className="text-blue-300 font-semibold">{job.title}</span> | Quản lý độc lập (Không ảnh hưởng đến lưu trữ CV)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa / Thêm bớt nội dung
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu bản sửa
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  title="Khôi phục lại JD gốc ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục gốc
                </button>
              </div>
            )}
            <span className="text-[11px] text-slate-400 hidden md:inline">
              {isEditing ? 'Đang ở chế độ chỉnh sửa trực tiếp' : 'Chế độ xem trước văn bản chuẩn'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
              title="Mở hộp thoại in và lưu file PDF chuẩn A4"
            >
              <Printer className="w-4 h-4" /> In / Xuất PDF (A4)
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Tải .txt
            </button>
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {isEditing ? (
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Bạn có thể trực tiếp thêm bớt, sửa đổi tiêu chí, quyền lợi, mô tả công việc của công ty bên dưới.
                </span>
                <span className="font-mono">{jdContent.length} ký tự</span>
              </div>
              <textarea
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                rows={20}
                className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed shadow-inner"
                placeholder="Nhập nội dung chi tiết bản JD..."
              />
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto select-all shadow-inner">
              {jdContent}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400 text-[11px]">
            Văn bản tiêu chuẩn gồm 6 phần đầy đủ: Tổng quan, Sứ mệnh, Trách nhiệm, Yêu cầu, Đãi ngộ, Quy trình.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
