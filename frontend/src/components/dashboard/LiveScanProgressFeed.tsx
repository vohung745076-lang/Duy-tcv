import React from 'react';
import { Radio, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ScanProgressItem {
  id: string;
  sourceUrl: string;
  timestamp: string;
  status: 'SUCCESS' | 'SCANNING' | 'ERROR';
  badgeText: string;
}

interface LiveScanProgressFeedProps {
  items: ScanProgressItem[];
}

export const LiveScanProgressFeed: React.FC<LiveScanProgressFeedProps> = ({ items }) => {
  return (
    <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#34D399] animate-pulse" />
          <span>Tiến Trình Quét AI Live</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">
          {items.length} tiến trình
        </span>
      </div>

      {/* Progress List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Chưa có tiến trình quét nào gần đây. Hãy dán link Google Docs/Sheets ở trên để bắt đầu!
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-[#141720] border border-[#242834]/80 hover:border-[#2D323F] rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all"
            >
              {/* Source URL & Time */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-slate-200 font-mono truncate max-w-[280px] sm:max-w-md" title={item.sourceUrl}>
                  {item.sourceUrl}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                  {item.timestamp}
                </span>
              </div>

              {/* Status Badge */}
              <div className="self-start sm:self-auto shrink-0">
                {item.status === 'SUCCESS' && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#064E3B]/70 text-[#34D399] border border-[#34D399]/30 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.badgeText}</span>
                  </span>
                )}
                {item.status === 'SCANNING' && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#1E293B] text-[#60A5FA] border border-[#60A5FA]/40 flex items-center gap-1.5 shadow-sm">
                    <Loader2 className="w-3 h-3 animate-spin text-[#60A5FA]" />
                    <span>{item.badgeText}</span>
                  </span>
                )}
                {item.status === 'ERROR' && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#4C0519]/70 text-[#FB7185] border border-[#FB7185]/30 flex items-center gap-1.5 shadow-sm">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{item.badgeText}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
