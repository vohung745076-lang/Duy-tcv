import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

interface ManualHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawQuote: string;
  onSave: (data: { title: string; category: string; raw_quote: string; value_add_analysis?: string }) => Promise<void>;
}

export const ManualHighlightModal: React.FC<ManualHighlightModalProps> = ({
  isOpen,
  onClose,
  rawQuote,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Kỹ năng chuyên môn');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Tự động gợi ý tên kỹ năng từ đoạn bôi đen ngắn (nếu ngắn dưới 40 ký tự)
      if (rawQuote && rawQuote.trim().length <= 40) {
        setTitle(rawQuote.trim());
      } else {
        setTitle('');
      }
      setCategory('Kỹ năng chuyên môn');
      setNote('');
    }
  }, [isOpen, rawQuote]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawQuote.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        category,
        raw_quote: rawQuote.trim(),
        value_add_analysis: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      alert('Không thể lưu kỹ năng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-4 sm:p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Ghi Nhận Kỹ Năng Bổ Sung</h3>
              <p className="text-[11px] text-slate-400">Đánh dấu thế mạnh / kỹ năng trên CV mà AI chưa đọc được</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Selected Quote Preview */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Đoạn văn bản vừa bôi đen trên CV:
            </label>
            <blockquote className="border-l-2 border-purple-500 bg-purple-950/20 p-2.5 rounded-r-lg text-purple-200 text-xs italic max-h-24 overflow-y-auto">
              "{rawQuote}"
            </blockquote>
          </div>

          {/* Skill Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Tên Kỹ năng / Điểm sáng *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Chứng chỉ AWS Solutions Architect, Tiếng Nhật N2, Quản lý Agile..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none text-xs"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Phân loại danh mục
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl p-2.5 text-white focus:outline-none text-xs"
            >
              <option value="Kỹ năng chuyên môn">Kỹ năng chuyên môn / Công nghệ</option>
              <option value="Chứng chỉ chuyên ngành">Chứng chỉ quốc tế / Bằng cấp</option>
              <option value="Kinh nghiệm thực chiến">Kinh nghiệm thực chiến / Quản lý dự án</option>
              <option value="Ngoại ngữ & Kỹ năng mềm">Ngoại ngữ & Kỹ năng mềm</option>
              <option value="Thành tích & Giải thưởng">Thành tích & Dự án nổi bật</option>
            </select>
          </div>

          {/* Value Add Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Nhận xét / Giá trị gia tăng cho công việc (Tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Giúp ứng viên thích ứng ngay với hệ thống Cloud của dự án..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Ghi Nhận Kỹ Năng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
