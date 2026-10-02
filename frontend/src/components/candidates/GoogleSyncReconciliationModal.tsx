import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  Users,
  Copy,
  FolderLock,
  ArrowRight,
  X
} from 'lucide-react';
import type { GoogleSyncResult } from '../../types';

interface GoogleSyncReconciliationModalProps {
  isOpen: boolean;
  result: GoogleSyncResult | null;
  onClose: () => void;
  onStartEvaluation?: () => void;
}

export const GoogleSyncReconciliationModal: React.FC<GoogleSyncReconciliationModalProps> = ({
  isOpen,
  result,
  onClose,
  onStartEvaluation,
}) => {
  if (!isOpen || !result) return null;

  const hasImported = result.newly_imported > 0;
  const hasPermissionIssues = result.permission_issues > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto relative flex flex-col">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              Kết Quả Đối Soát Hồ Sơ Google Sheets & Google Drive
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Nguồn dữ liệu: <span className="text-emerald-400 font-mono">{result.sheet_title || 'Google Sheet'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Tổng dòng Sheet
            </span>
            <span className="text-xl font-bold text-white mt-1 block">{result.total_rows}</span>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
            <span className="text-[11px] text-emerald-300 block font-medium flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Nạp & Tải PDF mới
            </span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{result.newly_imported}</span>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-center">
            <span className="text-[11px] text-amber-300 block font-medium flex items-center justify-center gap-1">
              <Copy className="w-3.5 h-3.5 text-amber-400" /> Trùng lặp (Bỏ qua)
            </span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{result.duplicates_skipped}</span>
          </div>

          <div className={`p-3 rounded-xl text-center border ${
            hasPermissionIssues
              ? 'bg-rose-950/40 border-rose-500/30'
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <span className={`text-[11px] block font-medium flex items-center justify-center gap-1 ${
              hasPermissionIssues ? 'text-rose-300' : 'text-slate-400'
            }`}>
              <FolderLock className="w-3.5 h-3.5" /> Lỗi quyền Drive
            </span>
            <span className={`text-xl font-bold mt-1 block ${
              hasPermissionIssues ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {result.permission_issues}
            </span>
          </div>
        </div>

        {/* Cảnh báo hướng dẫn quyền Drive nếu có */}
        {hasPermissionIssues && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              Thư mục chứa file tải lên của Form trên Google Drive đang bị khóa riêng tư:
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed pl-5">
              1. Vào Google Drive của bạn → Tìm thư mục kết quả tải lên của Form (thường có tên dạng <em>"[Tên Form] (File responses)"</em>).<br />
              2. Chuột phải vào thư mục → Chọn <strong>Chia sẻ (Share)</strong> → Đổi sang <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong>.<br />
              3. Sau khi mở quyền, bạn có thể bấm Đồng bộ lại để hệ thống tự động tải file PDF CV.
            </p>
          </div>
        )}

        {/* Reconciliation Table */}
        <div className="flex-1 overflow-hidden flex flex-col border border-slate-800 rounded-xl bg-slate-950/60 mb-5">
          <div className="p-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Chi tiết danh sách đối soát từng hồ sơ ({result.reconciliation_rows.length} hồ sơ)</span>
            <span className="text-[11px] text-slate-400 font-normal">Tự động đối soát Email, SĐT và Link Drive</span>
          </div>

          <div className="overflow-y-auto max-h-64 divide-y divide-slate-800/80">
            {result.reconciliation_rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Không có dữ liệu đối soát nào.</div>
            ) : (
              result.reconciliation_rows.map((row, idx) => (
                <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-900/50 transition-colors">
                  <div className="space-y-0.5 min-w-[200px]">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span className="text-slate-500 font-mono text-[10px]">#{row.row_index}</span>
                      <span>{row.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                      {row.email && <span>✉️ {row.email}</span>}
                      {row.phone && <span>📞 {row.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const rawUrl = row.drive_url?.trim() || '';
                      let driveHref: string | null = null;

                      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                        driveHref = rawUrl;
                      } else if (/^[a-zA-Z0-9_-]{25,55}$/.test(rawUrl)) {
                        driveHref = `https://drive.google.com/file/d/${rawUrl}/view`;
                      }

                      if (driveHref) {
                        return (
                          <a
                            href={driveHref}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
                            title="Mở file trên Google Drive để kiểm tra trực tiếp"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                            <span>Xem Drive</span>
                          </a>
                        );
                      }

                      if (row.candidate_id) {
                        return (
                          <a
                            href={`/api/v1/candidates/${row.candidate_id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
                            title="Xem file PDF đã tải về hệ thống"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                            <span>Xem PDF</span>
                          </a>
                        );
                      }

                      return (
                        <span className="text-slate-500 text-[11px] italic px-1" title={rawUrl || 'Không có link'}>
                          {rawUrl && rawUrl.length <= 20 ? rawUrl : 'Không có link Drive'}
                        </span>
                      );
                    })()}

                    {/* Status Badge */}
                    {row.status === 'IMPORTED' && (
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã tải & nạp PDF
                      </span>
                    )}
                    {row.status === 'DUPLICATE' && (
                      <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0">
                        <Copy className="w-3 h-3" />
                        Trùng lặp
                      </span>
                    )}
                    {row.status === 'NEEDS_PERMISSION' && (
                      <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0">
                        <FolderLock className="w-3 h-3" />
                        Chờ quyền Drive
                      </span>
                    )}
                    {row.status === 'FAILED' && (
                      <span className="px-2.5 py-1 bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold shrink-0">
                        Lỗi file
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            {result.message}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Đóng
            </button>

            {hasImported && onStartEvaluation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartEvaluation();
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all"
              >
                <span>Xem danh sách ứng viên</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
