import React from 'react';
import { Sparkles, Award, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { AdditionalHighlight } from '../../types';

interface AdditionalHighlightsSectionProps {
  highlights?: AdditionalHighlight[];
  onSelectHighlight?: (highlight: AdditionalHighlight) => void;
  activeQuote?: string | null;
}

export const AdditionalHighlightsSection: React.FC<AdditionalHighlightsSectionProps> = ({
  highlights = [],
  onSelectHighlight,
  activeQuote,
}) => {
  if (!highlights || highlights.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-center text-xs text-slate-500 italic">
        Không phát hiện kỹ năng hoặc chứng chỉ nêu thêm ngoài JD.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-cyan-300 text-xs flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Điểm Nêu Thêm & Năng Lực Bổ Trợ ({highlights.length})
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Giá trị gia tăng ngoài JD
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {highlights.map((item, idx) => {
          const isSelected = activeQuote && (activeQuote === item.title || activeQuote === item.raw_quote);

          return (
            <div
              key={idx}
              onClick={() => onSelectHighlight && onSelectHighlight(item)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-850/90 border-cyan-500/30 hover:border-cyan-400/80 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    <Award className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-bold text-white text-xs">{item.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold shrink-0">
                  {item.category}
                </span>
              </div>

              {item.raw_quote && (
                <blockquote className="border-l-2 border-cyan-500 pl-2.5 my-1.5 text-[11px] text-slate-300 italic line-clamp-2">
                  "{item.raw_quote}"
                </blockquote>
              )}

              {item.value_add_analysis && (
                <div className="mt-2 text-[10px] sm:text-[11px] text-cyan-200/90 bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/20 flex items-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{item.value_add_analysis}</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
                <span className="text-cyan-400/80 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Bấm để xem vị trí khoanh vùng trên CV
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
