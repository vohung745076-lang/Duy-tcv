import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { EvidenceItem, AdditionalHighlight, IndustryCertification } from '../../types';
import { PDFPageRenderer, type HighlightBox, type SearchTarget } from './PDFPageRenderer';

// Cấu hình Worker cho PDF.js trong môi trường Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFInteractiveViewerProps {
  pdfUrl: string;
  matchedEvidences: EvidenceItem[];
  industryCertifications?: IndustryCertification[];
  additionalHighlights?: AdditionalHighlight[];
  activeHighlightQuote: string | null;
  candidateName?: string;
  onSelectQuote?: (quote: string) => void;
  onTextExtracted?: (fullText: string) => void;
}

export const PDFInteractiveViewer: React.FC<PDFInteractiveViewerProps> = ({
  pdfUrl,
  matchedEvidences,
  industryCertifications = [],
  additionalHighlights = [],
  activeHighlightQuote,
  onSelectQuote,
  onTextExtracted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [showHighlights, setShowHighlights] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [boxesByPage, setBoxesByPage] = useState<{ [pageNum: number]: HighlightBox[] }>({});

  // 1. Tải tài liệu PDF bằng ArrayBuffer (Bảo mật & Không lỗi CORS)
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Không thể nạp file PDF (${response.status} ${response.statusText})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Lỗi khi nạp PDF trong PDFInteractiveViewer:', err);
          setError(err?.message || 'Không thể hiển thị PDF.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // 1.1 Tự động bóc tách toàn bộ văn bản của tất cả các trang qua PDF.js để làm cầu nối đồng bộ với AI
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const extractTextFromAllPages = async () => {
      try {
        const pagesText: string[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const tc = await page.getTextContent();
          const pText = (tc.items as any[]).map((it) => it.str || '').join(' ').trim();
          if (pText) {
            pagesText.push(`--- Page ${i} ---\n${pText}`);
          }
        }
        const fullText = pagesText.join('\n\n').trim();
        if (!isCancelled && fullText && onTextExtracted) {
          onTextExtracted(fullText);
        }
      } catch (err) {
        console.error('Lỗi khi trích xuất text qua PDF.js:', err);
      }
    };

    void extractTextFromAllPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, onTextExtracted]);

  // Chuẩn bị danh sách từ khóa và câu trích dẫn cần khoanh vùng
  const searchTargets: SearchTarget[] = useMemo(() => {
    const targets: SearchTarget[] = [];

    // Kỹ năng bắt buộc & ưu tiên đã đạt (🟢 Xanh lá)
    for (const ev of matchedEvidences) {
      if (ev.matched) {
        const cleanedSkillName = ev.criterion
          .replace(/^(?:kỹ\s*năng\s*(?:bắt\s*buộc|ưu\s*tiên)\s*[:：\-]?\s*)/i, '')
          .trim();
        const kwParts = cleanedSkillName.split(/[/,+|]/).map((k) => k.trim()).filter((k) => k.length > 1);
        targets.push({
          type: 'skill',
          title: cleanedSkillName,
          quote: ev.raw_quote || cleanedSkillName,
          keywords: [cleanedSkillName, ...kwParts, ev.raw_quote].filter(Boolean),
        });
      }
    }

    // Chứng chỉ của ngành (🟣 Tím)
    for (const cert of industryCertifications) {
      targets.push({
        type: 'cert',
        title: cert.title,
        quote: cert.raw_quote || cert.title,
        keywords: [cert.title, cert.raw_quote, 'Associate', 'IBM', 'Power BI', 'Certificate'].filter(Boolean),
      });
    }

    // Các điểm mạnh bổ trợ nếu chưa nằm trong certs
    for (const hl of additionalHighlights) {
      if (!targets.some((t) => t.title.toLowerCase() === hl.title.toLowerCase())) {
        targets.push({
          type: 'exp',
          title: hl.title,
          quote: hl.raw_quote || hl.title,
          keywords: [hl.title, hl.raw_quote].filter(Boolean),
        });
      }
    }

    return targets;
  }, [matchedEvidences, industryCertifications, additionalHighlights]);

  const handleBoxesCalculated = useCallback((pageNum: number, boxes: HighlightBox[]) => {
    setBoxesByPage((prev) => ({
      ...prev,
      [pageNum]: boxes,
    }));
  }, []);

  // Tổng số lượng vị trí khoanh vùng trên toàn bộ các trang
  const totalBoxesCount = useMemo(() => {
    return Object.values(boxesByPage).reduce((acc, boxes) => acc + boxes.length, 0);
  }, [boxesByPage]);

  // Cuộn đến một trang cụ thể
  const scrollToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return;
    setCurrentPage(pageNum);
    const pageEl = document.getElementById(`pdf-page-${pageNum}`);
    if (pageEl && containerRef.current) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages]);

  // Theo dõi vị trí cuộn để cập nhật số trang hiện tại
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages <= 1) return;

    const handleScroll = () => {
      const pageElements = Array.from({ length: numPages }).map((_, i) =>
        document.getElementById(`pdf-page-${i + 1}`)
      );

      const containerTop = container.scrollTop;
      let activeIndex = 0;

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        if (el) {
          const elTop = el.offsetTop - container.offsetTop;
          if (containerTop >= elTop - 150) {
            activeIndex = i;
          }
        }
      }

      setCurrentPage(activeIndex + 1);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages]);

  // Tự động cuộn đến hộp highlight khi HR click bên bảng điều khiển AI
  useEffect(() => {
    if (!activeHighlightQuote) return;

    const activeQuoteLower = activeHighlightQuote.toLowerCase().trim();

    for (const [pageNumStr, boxes] of Object.entries(boxesByPage)) {
      const pageNum = parseInt(pageNumStr, 10);
      const matchedBox = boxes.find(
        (b) =>
          b.quote.toLowerCase().includes(activeQuoteLower) ||
          activeQuoteLower.includes(b.quote.toLowerCase()) ||
          b.title.toLowerCase().includes(activeQuoteLower)
      );

      if (matchedBox) {
        scrollToPage(pageNum);
        break;
      }
    }
  }, [activeHighlightQuote, boxesByPage, scrollToPage]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-400 gap-3 min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-300">
          Đang nạp và dựng toàn bộ các trang tài liệu PDF...
        </p>
        <span className="text-[11px] text-slate-500">
          Phân tích đa trang độc lập & lớp văn bản Native TextLayer
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-400 gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-xs text-rose-300 font-bold">{error}</p>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Mở file PDF gốc trong tab mới</span>
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative font-['Be_Vietnam_Pro',sans-serif] min-h-0 w-full h-full">
      {/* TOOLBAR ĐIỀU KHIỂN TRÊN CÙNG */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 z-20 shrink-0 text-xs flex-wrap">
        {/* Thông tin số lượng khoanh vùng & Chuyển Trang Đa Trang */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Khoanh vùng AI: <strong>{totalBoxesCount}</strong> vị trí</span>
          </div>

          {/* BỘ ĐIỀU HƯỚNG CHUYỂN TRANG ĐA TRANG (MULTI-PAGE CONTROLLER) */}
          {numPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-200">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500/60 border border-emerald-400" />
            <span>Kỹ năng Đạt</span>
            <span className="inline-block w-2.5 h-2.5 rounded bg-purple-500/60 border border-purple-400 ml-2" />
            <span>Chứng chỉ ngành</span>
          </div>
        </div>

        {/* Nút thao tác phóng to, thu nhỏ & ẩn/hiện khoanh vùng */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`px-2 py-1 rounded-lg font-medium text-[11px] flex items-center gap-1 border transition-colors ${
              showHighlights
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Bật / Tắt lớp khoanh vùng màu trên PDF"
          >
            {showHighlights ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{showHighlights ? 'Ẩn khoanh vùng' : 'Hiện khoanh vùng'}</span>
          </button>

          <button
            onClick={() => setScale((s) => Math.max(0.75, s - 0.15))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1 text-[11px] font-mono text-slate-400 min-w-[36px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors ml-1"
            title="Mở file gốc trong tab riêng"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* KHUNG CUỘN CHỨA TẤT CẢ CÁC TRANG PDF (HIỂN THỊ ĐẦY ĐỦ CÁC TRANG VÀ CÓ THANH CUỘN RÕ RÀNG) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll overflow-x-auto p-4 sm:p-6 flex flex-col items-center gap-6 bg-slate-950/90 scroll-smooth min-h-0 w-full [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-600 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: '#475569 #0f172a',
        }}
      >
        {pdfDoc &&
          Array.from({ length: numPages }).map((_, index) => {
            const pageNum = index + 1;
            return (
              <PDFPageRenderer
                key={`page-renderer-${pageNum}`}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                numPages={numPages}
                scale={scale}
                showHighlights={showHighlights}
                searchTargets={searchTargets}
                activeHighlightQuote={activeHighlightQuote}
                onSelectQuote={onSelectQuote}
                onPageBoxesCalculated={handleBoxesCalculated}
              />
            );
          })}
      </div>
    </div>
  );
};
