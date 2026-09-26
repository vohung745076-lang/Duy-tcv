import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  FileText,
  UserCheck,
} from 'lucide-react';
import type { EvidenceItem, AdditionalHighlight } from '../../types';

interface SmartCVViewerProps {
  cvText: string;
  matchedEvidences: EvidenceItem[];
  additionalHighlights: AdditionalHighlight[];
  activeHighlightQuote: string | null;
  candidateName?: string;
  onClearActiveHighlight?: () => void;
  onRequestAddHighlight?: (quote: string) => void;
}

interface CVBlock {
  id: string;
  text: string;
  matchedEvidence?: EvidenceItem;
  additionalHighlight?: AdditionalHighlight;
  isHeading?: boolean;
  isPageDivider?: boolean;
  isBlank?: boolean;
}

interface SelectionPosition {
  top: number;
  left: number;
  quote: string;
}

export const SmartCVViewer: React.FC<SmartCVViewerProps> = ({
  cvText,
  matchedEvidences,
  additionalHighlights,
  activeHighlightQuote,
  candidateName,
  onClearActiveHighlight,
  onRequestAddHighlight,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'extra'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [floatingPos, setFloatingPos] = useState<SelectionPosition | null>(null);

  const activeRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lắng nghe bôi đen chữ trên CV để hiện nút "Ghi nhận kỹ năng"
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setFloatingPos(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) {
      setFloatingPos(null);
      return;
    }

    // Đảm bảo vùng bôi đen nằm trong container CV
    if (containerRef.current && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (containerRef.current.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setFloatingPos({
          top: Math.max(10, rect.top - 42),
          left: Math.max(10, rect.left + rect.width / 2),
          quote: selectedText,
        });
        return;
      }
    }

    setFloatingPos(null);
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setFloatingPos(null);
      }
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, []);

  // Phân tích văn bản CV theo từng dòng tự nhiên, giữ cấu trúc mạch lạc
  const blocks: CVBlock[] = useMemo(() => {
    if (!cvText) return [];

    const rawLines = cvText.split(/\r?\n/).map((l) => l.trim());
    const result: CVBlock[] = [];

    rawLines.forEach((line, idx) => {
      // Dòng trống
      if (!line) {
        if (result.length > 0 && !result[result.length - 1].isBlank) {
          result.push({
            id: `blank-${idx}`,
            text: '',
            isBlank: true,
          });
        }
        return;
      }

      // 1. Phân tách trang (--- Page X ---)
      const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---$/i);
      if (pageMatch) {
        result.push({
          id: `page-${idx}`,
          text: `Trang ${pageMatch[1]}`,
          isPageDivider: true,
        });
        return;
      }

      // 2. Nhận diện tiêu đề mục (KINH NGHIỆM, HỌC VẤN, KỸ NĂNG, DỰ ÁN...)
      const isHeading =
        line.length < 50 &&
        (line.toUpperCase() === line ||
          /^(kinh nghiệm|học vấn|kỹ năng|mục tiêu|dự án|ngoại ngữ|thành tích|chứng chỉ|thông tin cá nhân|experience|education|skills|projects|summary|certifications|languages)/i.test(
            line
          )) &&
        !line.startsWith('•') &&
        !line.startsWith('-') &&
        !line.startsWith('*') &&
        !line.includes('@');

      if (isHeading) {
        result.push({
          id: `heading-${idx}`,
          text: line,
          isHeading: true,
        });
        return;
      }

      // 3. Khớp chính xác với tiêu chí JD (Xanh lá)
      let matchedEv: EvidenceItem | undefined;
      const lineClean = line.toLowerCase();

      for (const ev of matchedEvidences) {
        if (!ev.raw_quote || ev.raw_quote.trim().length < 5) continue;
        const qClean = ev.raw_quote.toLowerCase().trim();
        // Khớp khi dòng chứa câu trích dẫn hoặc ngược lại
        if (lineClean.includes(qClean) || qClean.includes(lineClean)) {
          matchedEv = ev;
          break;
        }
      }

      // 4. Khớp với kỹ năng bổ sung (Tím cho HR, Xanh dương cho AI)
      let extraHl: AdditionalHighlight | undefined;
      if (!matchedEv) {
        for (const hl of additionalHighlights) {
          const qClean = hl.raw_quote ? hl.raw_quote.toLowerCase().trim() : '';
          const tClean = hl.title ? hl.title.toLowerCase().trim() : '';

          if (qClean && qClean.length >= 4 && (lineClean.includes(qClean) || qClean.includes(lineClean))) {
            extraHl = hl;
            break;
          } else if (tClean && tClean.length >= 3 && lineClean.includes(tClean)) {
            extraHl = hl;
            break;
          }
        }
      }

      result.push({
        id: `line-${idx}`,
        text: line,
        matchedEvidence: matchedEv,
        additionalHighlight: extraHl,
      });
    });

    return result;
  }, [cvText, matchedEvidences, additionalHighlights]);

  // Bộ lọc văn bản theo tìm kiếm và chế độ lọc
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (b.isBlank || b.isPageDivider) return filterMode === 'all' && !searchTerm;
      if (searchTerm) {
        const matchesSearch = b.text.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
      }
      if (filterMode === 'matched') return !!b.matchedEvidence;
      if (filterMode === 'extra') return !!b.additionalHighlight;
      return true;
    });
  }, [blocks, filterMode, searchTerm]);

  // Tự động cuộn đến trích dẫn khi được chọn
  useEffect(() => {
    if (activeHighlightQuote && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlightQuote]);

  const matchedCount = blocks.filter((b) => b.matchedEvidence).length;
  const extraCount = blocks.filter((b) => b.additionalHighlight).length;

  return (
    <div className="relative flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-text">
      {/* Nút nổi "Ghi nhận kỹ năng" khi bôi đen */}
      {floatingPos && onRequestAddHighlight && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestAddHighlight(floatingPos.quote);
            setFloatingPos(null);
            window.getSelection()?.removeAllRanges();
          }}
          style={{
            position: 'fixed',
            top: `${floatingPos.top}px`,
            left: `${floatingPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl shadow-purple-900/60 flex items-center gap-1.5 transition-all border border-purple-400 cursor-pointer animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-200" />
          <span>Ghi nhận kỹ năng</span>
        </button>
      )}

      {/* Control Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              filterMode === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3 h-3" /> Toàn văn CV
          </button>
          <button
            onClick={() => setFilterMode('matched')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'matched'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
            }`}
            title="Chỉ xem các dòng trích dẫn khớp JD (Màu xanh lá)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Khớp JD ({matchedCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('extra')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'extra'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-sm'
                : 'bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/50'
            }`}
            title="Chỉ xem các kỹ năng/thế mạnh nêu thêm hoặc HR ghi nhận"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Nêu Thêm & HR ({extraCount})</span>
          </button>
        </div>

        {/* Search & Font size */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm từ khóa trong CV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-28 sm:w-44"
            />
          </div>

          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px] font-bold">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-0.5 rounded ${fontSize === 'sm' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Cỡ chữ chuẩn"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-0.5 rounded ${fontSize === 'base' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Cỡ chữ lớn"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Chú thích màu sắc gọn gàng */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {candidateName && (
            <span className="font-bold text-slate-200 border-r border-slate-700 pr-3">
              {candidateName}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Xanh Lá: Khớp tiêu chí JD
          </span>
          <span className="flex items-center gap-1.5 text-purple-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            Tím: Kỹ năng HR ghi nhận
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Xanh Dương: Điểm mạnh AI phát hiện
          </span>
        </div>
        {activeHighlightQuote && (
          <button
            onClick={onClearActiveHighlight}
            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            Bỏ lọc theo tiêu chí
          </button>
        )}
      </div>

      {/* Vùng hiển thị văn bản CV - Layout sạch sẽ, thoáng đãng */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`flex-1 overflow-y-auto p-4 sm:p-6 font-sans space-y-1 ${
          fontSize === 'sm' ? 'text-xs' : fontSize === 'base' ? 'text-sm' : 'text-base'
        }`}
      >
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Không tìm thấy dòng văn bản nào phù hợp bộ lọc hoặc từ khóa tìm kiếm.
          </div>
        ) : (
          filteredBlocks.map((block) => {
            // Dòng trống
            if (block.isBlank) {
              return <div key={block.id} className="h-2" />;
            }

            // Dấu phân trang
            if (block.isPageDivider) {
              return (
                <div
                  key={block.id}
                  className="my-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono"
                >
                  <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {block.text}
                  </span>
                  <span className="text-[10px] text-slate-600">Đối Soát Văn Bản</span>
                </div>
              );
            }

            // Tiêu đề phân mục lớn (KINH NGHIỆM, HỌC VẤN...)
            if (block.isHeading) {
              return (
                <h3
                  key={block.id}
                  className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider pt-3 pb-1 border-b border-slate-800 flex items-center gap-2"
                >
                  <span className="w-1.5 h-3 bg-cyan-500 rounded-full inline-block" />
                  {block.text}
                </h3>
              );
            }

            const isMatchActive =
              activeHighlightQuote &&
              block.matchedEvidence &&
              block.matchedEvidence.raw_quote &&
              block.matchedEvidence.raw_quote.toLowerCase().includes(activeHighlightQuote.toLowerCase());

            const isExtraActive =
              activeHighlightQuote &&
              block.additionalHighlight &&
              (block.additionalHighlight.title.toLowerCase().includes(activeHighlightQuote.toLowerCase()) ||
                block.additionalHighlight.raw_quote.toLowerCase().includes(activeHighlightQuote.toLowerCase()));

            const isActive = isMatchActive || isExtraActive;

            // TRƯỜNG HỢP 1: DÒNG KHỚP TIÊU CHÍ JD (HIGHLIGHT XANH LÁ TINH GỌN)
            if (block.matchedEvidence) {
              return (
                <div
                  key={block.id}
                  ref={isActive ? activeRef : undefined}
                  className={`relative border-l-4 border-emerald-500 bg-emerald-950/30 text-emerald-100 rounded-r-xl p-2.5 my-1.5 transition-all shadow-sm ${
                    isActive ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[11px] font-bold text-emerald-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      [✓ Khớp JD]: {block.matchedEvidence.criterion}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] shrink-0 font-mono">
                      Đạt {block.matchedEvidence.score}%
                    </span>
                  </div>
                  <p className="text-xs text-white leading-relaxed font-medium">{block.text}</p>
                  {block.matchedEvidence.explanation && (
                    <div className="mt-1 text-[10px] text-emerald-300/80 italic">
                      {block.matchedEvidence.explanation}
                    </div>
                  )}
                </div>
              );
            }

            // TRƯỜNG HỢP 2: DÒNG CÓ KỸ NĂNG BỔ SUNG (TÍM CHO HR / XANH DƯƠNG CHO AI)
            if (block.additionalHighlight) {
              const isHr = block.additionalHighlight.is_hr_added;

              if (isHr) {
                return (
                  <div
                    key={block.id}
                    ref={isActive ? activeRef : undefined}
                    className={`relative border-l-4 border-purple-500 bg-purple-950/35 text-purple-100 rounded-r-xl p-2.5 my-1.5 transition-all shadow-sm ${
                      isActive ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 text-[11px] font-bold text-purple-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        Kỹ năng: {block.additionalHighlight.title} (HR ghi nhận)
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 text-[10px] shrink-0">
                        {block.additionalHighlight.category}
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed font-medium">{block.text}</p>
                    {block.additionalHighlight.value_add_analysis && (
                      <div className="mt-1 text-[10px] text-purple-300/90 italic">
                        Nhận định: {block.additionalHighlight.value_add_analysis}
                      </div>
                    )}
                    {block.additionalHighlight.added_by && (
                      <div className="mt-1 text-[9px] text-purple-400/80 flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>Ghi nhận bởi: {block.additionalHighlight.added_by}</span>
                      </div>
                    )}
                  </div>
                );
              }

              // AI Nêu thêm (Xanh dương)
              return (
                <div
                  key={block.id}
                  ref={isActive ? activeRef : undefined}
                  className={`relative border-l-4 border-cyan-500 bg-cyan-950/30 text-cyan-100 rounded-r-xl p-2.5 my-1.5 transition-all shadow-sm ${
                    isActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[11px] font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      [★ Điểm sáng]: {block.additionalHighlight.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] shrink-0">
                      {block.additionalHighlight.category}
                    </span>
                  </div>
                  <p className="text-xs text-white leading-relaxed font-medium">{block.text}</p>
                  {block.additionalHighlight.value_add_analysis && (
                    <div className="mt-1 text-[10px] text-cyan-300/80 italic">
                      Giá trị: {block.additionalHighlight.value_add_analysis}
                    </div>
                  )}
                </div>
              );
            }

            // TRƯỜNG HỢP 4: DÒNG VĂN BẢN CV THÔNG THƯỜNG - BASIC, XUỐNG DÒNG RÕ RÀNG
            return (
              <p
                key={block.id}
                className="leading-relaxed text-slate-200 py-0.5 text-xs hover:text-white transition-colors"
              >
                {block.text}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
};
