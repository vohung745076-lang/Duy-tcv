import React from 'react';
import { Sparkles, Mail, FileSpreadsheet, Trash2, X, CheckSquare } from 'lucide-react';

interface FloatingBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onRunAiBatch: () => void;
  onSendEmailBatch: () => void;
  onExportBatch: () => void;
  onDeleteBatch: () => void;
}

export const FloatingBulkActionBar: React.FC<FloatingBulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onRunAiBatch,
  onSendEmailBatch,
  onExportBatch,
  onDeleteBatch,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-xs text-zinc-200 backdrop-blur-lg">
        {/* Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#27272A]">
          <CheckSquare className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white">Đã chọn {selectedCount} ứng viên</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRunAiBatch}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chạy AI Screening</span>
          </button>

          <button
            type="button"
            onClick={onSendEmailBatch}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gửi thư mời</span>
          </button>

          <button
            type="button"
            onClick={onExportBatch}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={onDeleteBatch}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Loại</span>
          </button>
        </div>

        {/* Close Selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="ml-1 p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Bỏ chọn tất cả"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
