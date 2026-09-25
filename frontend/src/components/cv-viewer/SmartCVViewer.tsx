import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  FileText,
  Zap,
  Info,
} from 'lucide-react';
import type { EvidenceItem, AdditionalHighlight } from '../../types';

interface SmartCVViewerProps {
  cvText: string;
  matchedEvidences: EvidenceItem[];
  additionalHighlights: AdditionalHighlight[];
  activeHighlightQuote: string | null;
  candidateName?: string;
  onClearActiveHighlight?: () => void;
}

interface CVBlock {
  id: string;
  text: string;
  matchedEvidence?: EvidenceItem;
  additionalHighlight?: AdditionalHighlight;
  isHeading?: boolean;
}

export const SmartCVViewer: React.FC<SmartCVViewerProps> = ({
  cvText,
  matchedEvidences,
  additionalHighlights,
  activeHighlightQuote,
  candidateName,
  onClearActiveHighlight,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'extra'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Parse CV Text into blocks with bounding annotations
  const blocks: CVBlock[] = useMemo(() => {
    if (!cvText) return [];

    // Split text by lines and group into sensible paragraphs
    const rawLines = cvText.split(/\r?\n/).map((l) => l.trim());
    const result: CVBlock[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length === 0) return;
      const combined = currentParagraph.join(' ').trim();
      if (!combined) return;

      const isHeading =
        combined.length < 50 &&
        (combined.toUpperCase() === combined ||
          /^(kinh nghiệm|học vấn|kỹ năng|mục tiêu|dự án|experience|education|skills|projects|summary|certifications|chứng chỉ)/i.test(
            combined
          ));

      // Check for JD matches (Green)
      let matchedEv: EvidenceItem | undefined;
      for (const ev of matchedEvidences) {
        if (!ev.raw_quote || ev.raw_quote.length < 4) continue;
        const qClean = ev.raw_quote.toLowerCase().replace(/["'.,]/g, '').trim();
        const bClean = combined.toLowerCase().replace(/["'.,]/g, '').trim();
        if (bClean.includes(qClean) || qClean.includes(bClean) || (ev.criterion && combined.toLowerCase().includes(ev.criterion.toLowerCase().replace('kỹ năng bắt buộc:', '').trim()))) {
          matchedEv = ev;
          break;
        }
      }

      // Check for Additional Highlights (Cyan / Purple)
      let extraHl: AdditionalHighlight | undefined;
      if (!matchedEv) {
        for (const hl of additionalHighlights) {
          const tClean = hl.title.toLowerCase();
          const qClean = hl.raw_quote.toLowerCase();
          const bClean = combined.toLowerCase();
          if (bClean.includes(tClean) || (qClean.length > 5 && bClean.includes(qClean))) {
            extraHl = hl;
            break;
          }
        }
      }

      result.push({
        id: `block-${result.length}`,
        text: combined,
        matchedEvidence: matchedEv,
        additionalHighlight: extraHl,
        isHeading,
      });

      currentParagraph = [];
    };

    for (const line of rawLines) {
      if (!line) {
        flushParagraph();
      } else {
        currentParagraph.push(line);
      }
    }
    flushParagraph();

    return result;
  }, [cvText, matchedEvidences, additionalHighlights]);

  // Filtered blocks based on user filter selection & search
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (searchTerm) {
        const matchesSearch = b.text.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
      }
      if (filterMode === 'matched') return !!b.matchedEvidence;
      if (filterMode === 'extra') return !!b.additionalHighlight;
      return true;
    });
  }, [blocks, filterMode, searchTerm]);

  // Auto-scroll to activeHighlightQuote if selected
  useEffect(() => {
    if (activeHighlightQuote && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlightQuote]);

  const matchedCount = blocks.filter((b) => b.matchedEvidence).length;
  const extraCount = blocks.filter((b) => b.additionalHighlight).length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
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
            <Filter className="w-3 h-3" /> Tất cả ({blocks.length})
          </button>
          <button
            onClick={() => setFilterMode('matched')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'matched'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
            }`}
            title="Chỉ xem các vùng đối soát khớp với JD (Màu xanh lá)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vùng Khớp JD ({matchedCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('extra')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'extra'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/50'
            }`}
            title="Chỉ xem các vùng ứng viên nêu thêm ngoài JD (Màu xanh dương/tím)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Điểm Nêu Thêm ({extraCount})</span>
          </button>
        </div>

        {/* Search & Font size */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm trong CV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-28 sm:w-40"
            />
          </div>

          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px] font-bold">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-0.5 rounded ${fontSize === 'sm' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Cỡ chữ nhỏ"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-0.5 rounded ${fontSize === 'base' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Cỡ chữ vừa"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar (Bảng giải thích màu sắc đối soát) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          {candidateName && (
            <span className="font-bold text-slate-200 border-r border-slate-700 pr-3">
              {candidateName}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 inline-block" />
            Khoanh vùng Xanh Lá: Khớp tiêu chí JD
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-500/20 inline-block" />
            Khoanh vùng Xanh Dương: Điểm mạnh / Nêu thêm
          </span>
        </div>
        {activeHighlightQuote && (
          <button
            onClick={onClearActiveHighlight}
            className="text-[10px] text-slate-400 hover:text-white underline"
          >
            Bỏ chọn tiêu chí
          </button>
        )}
      </div>

      {/* Main Document Content Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 font-sans ${
          fontSize === 'sm' ? 'text-xs' : fontSize === 'base' ? 'text-sm' : 'text-base'
        }`}
      >
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Không tìm thấy đoạn văn bản nào phù hợp bộ lọc hoặc từ khóa tìm kiếm.
          </div>
        ) : (
          filteredBlocks.map((block) => {
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

            // CASE 1: MATCHED WITH JD (GREEN BOUNDING BOX)
            if (block.matchedEvidence) {
              return (
                <div
                  key={block.id}
                  ref={isActive ? activeRef : undefined}
                  className={`relative border-2 border-emerald-500 bg-emerald-950/25 text-emerald-100 rounded-xl p-3.5 sm:p-4 my-2.5 transition-all shadow-lg shadow-emerald-500/10 ${
                    isActive ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-emerald-500/30">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      [✓ KHỚP TIÊU CHÍ JD]: {block.matchedEvidence.criterion}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      Đạt {block.matchedEvidence.score}%
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-100 font-medium whitespace-pre-wrap">{block.text}</p>
                  {block.matchedEvidence.explanation && (
                    <div className="mt-2 text-[11px] text-emerald-300/90 bg-emerald-950/50 p-2 rounded-lg border border-emerald-500/20 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{block.matchedEvidence.explanation}</span>
                    </div>
                  )}
                </div>
              );
            }

            // CASE 2: ADDITIONAL HIGHLIGHT (CYAN / BLUE BOUNDING BOX)
            if (block.additionalHighlight) {
              return (
                <div
                  key={block.id}
                  ref={isActive ? activeRef : undefined}
                  className={`relative border-2 border-cyan-500 bg-cyan-950/25 text-cyan-100 rounded-xl p-3.5 sm:p-4 my-2.5 transition-all shadow-lg shadow-cyan-500/10 ${
                    isActive ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-cyan-500/30">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      [★ ĐIỂM NÊU THÊM NGOÀI JD]: {block.additionalHighlight.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold text-[10px]">
                      {block.additionalHighlight.category}
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-100 font-medium whitespace-pre-wrap">{block.text}</p>
                  {block.additionalHighlight.value_add_analysis && (
                    <div className="mt-2 text-[11px] text-cyan-200/90 bg-cyan-950/50 p-2 rounded-lg border border-cyan-500/20 flex items-start gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Giá trị thặng dư:</strong> {block.additionalHighlight.value_add_analysis}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            // CASE 3: SECTION HEADING
            if (block.isHeading) {
              return (
                <h4
                  key={block.id}
                  className="font-bold text-slate-300 uppercase tracking-wider pt-3 pb-1 border-b border-slate-800 text-[11px] sm:text-xs flex items-center gap-2"
                >
                  <span className="w-1.5 h-3 bg-blue-500 rounded-full inline-block" />
                  {block.text}
                </h4>
              );
            }

            // CASE 4: REGULAR CV TEXT
            return (
              <p
                key={block.id}
                className="leading-relaxed text-slate-300 hover:text-slate-100 transition-colors py-0.5"
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
