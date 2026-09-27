import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { EvidenceItem, AdditionalHighlight, IndustryCertification } from '../../types';

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
}

interface HighlightBox {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'skill' | 'cert' | 'exp' | 'edu';
  title: string;
  quote: string;
  matchedText: string;
}

interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
  boxes: HighlightBox[];
}

export const PDFInteractiveViewer: React.FC<PDFInteractiveViewerProps> = ({
  pdfUrl,
  matchedEvidences,
  industryCertifications = [],
  additionalHighlights = [],
  activeHighlightQuote,
  onSelectQuote,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);
  const [showHighlights, setShowHighlights] = useState(true);
  const [pagesData, setPagesData] = useState<RenderedPage[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const boxRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 1. Tải tài liệu PDF bằng ArrayBuffer (Bảo mật & Không lỗi CORS)
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

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

  // Chuẩn bị danh sách từ khóa và câu trích dẫn cần khoanh vùng
  const searchTargets = React.useMemo(() => {
    const targets: {
      type: 'skill' | 'cert' | 'exp' | 'edu';
      title: string;
      quote: string;
      keywords: string[];
    }[] = [];

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
          type: 'cert',
          title: hl.title,
          quote: hl.raw_quote || hl.title,
          keywords: [hl.title, hl.raw_quote].filter(Boolean),
        });
      }
    }

    return targets;
  }, [matchedEvidences, industryCertifications, additionalHighlights]);

  // 2. Render từng trang PDF lên Canvas và tính toán tọa độ khoanh vùng
  const renderAllPages = useCallback(async () => {
    if (!pdfDoc) return;

    const renderedPages: RenderedPage[] = [];

    for (let pIdx = 1; pIdx <= pdfDoc.numPages; pIdx++) {
      const page = await pdfDoc.getPage(pIdx);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRefs.current[pIdx - 1];

      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          } as any).promise;
        }
      }

      // Trích xuất vị trí Text Layer để khoanh vùng
      const textContent = await page.getTextContent();
      const boxes: HighlightBox[] = [];

      const items = textContent.items as any[];
      // Gộp các text items thành chuỗi để tìm kiếm vị trí
      const pageFullText = items.map((it) => it.str).join(' ');
      const pageFullTextLower = pageFullText.toLowerCase();

      for (const target of searchTargets) {
        for (const kw of target.keywords) {
          if (!kw || kw.length < 2) continue;
          const kwLower = kw.toLowerCase().trim();

          // Kiểm tra xem từ khóa có nằm trong trang này không
          if (pageFullTextLower.includes(kwLower)) {
            // Tìm các text items khớp với từ khóa
            const matchingItems = items.filter((it) => {
              const strLower = (it.str || '').toLowerCase();
              return strLower.includes(kwLower) || kwLower.includes(strLower) && strLower.length > 2;
            });

            if (matchingItems.length > 0) {
              let minX = Infinity;
              let minY = Infinity;
              let maxX = -Infinity;
              let maxY = -Infinity;

              for (const it of matchingItems) {
                // Biến đổi tọa độ PDF sang tọa độ Canvas Viewport
                const tx = it.transform[4];
                const ty = it.transform[5];
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                const itWidth = (it.width || 40) * scale;
                const itHeight = (it.height || 14) * scale;

                minX = Math.min(minX, vx);
                maxX = Math.max(maxX, vx + itWidth);
                minY = Math.min(minY, vy - itHeight);
                maxY = Math.max(maxY, vy);
              }

              // Mở rộng padding nhẹ để bao bọc đẹp mắt
              const padX = 6;
              const padY = 4;
              const boxW = Math.max(maxX - minX + padX * 2, 40);
              const boxH = Math.max(maxY - minY + padY * 2, 18);
              const boxX = Math.max(minX - padX, 2);
              const boxY = Math.max(minY - padY, 2);

              const boxId = `box-${pIdx}-${target.type}-${target.title.replace(/\s+/g, '_')}`;

              // Tránh trùng lặp hộp khoanh vùng trên cùng 1 trang
              if (!boxes.some((b) => b.title === target.title)) {
                boxes.push({
                  id: boxId,
                  pageIndex: pIdx,
                  x: boxX,
                  y: boxY,
                  width: boxW,
                  height: boxH,
                  type: target.type,
                  title: target.title,
                  quote: target.quote,
                  matchedText: kw,
                });
              }
              break; // Đã tìm thấy vị trí khớp cho tiêu chí này
            }
          }
        }
      }

      renderedPages.push({
        pageNumber: pIdx,
        width: viewport.width,
        height: viewport.height,
        scale,
        boxes,
      });
    }

    setPagesData(renderedPages);
  }, [pdfDoc, scale, searchTargets]);

  useEffect(() => {
    void renderAllPages();
  }, [renderAllPages]);

  // 3. Tự động cuộn và nhấp nháy khi HR click tiêu chí bên bảng bên phải
  useEffect(() => {
    if (!activeHighlightQuote) return;

    const activeQuoteLower = activeHighlightQuote.toLowerCase().trim();

    // Tìm box phù hợp nhất
    for (const page of pagesData) {
      for (const box of page.boxes) {
        if (
          box.quote.toLowerCase().includes(activeQuoteLower) ||
          activeQuoteLower.includes(box.quote.toLowerCase()) ||
          box.title.toLowerCase().includes(activeQuoteLower) ||
          activeQuoteLower.includes(box.title.toLowerCase())
        ) {
          const el = boxRefs.current[box.id];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }
    }
  }, [activeHighlightQuote, pagesData]);

  const totalBoxesCount = pagesData.reduce((acc, p) => acc + p.boxes.length, 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-400 gap-3 min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-300">
          Đang dựng tài liệu PDF & định vị khoanh vùng trực tiếp...
        </p>
        <span className="text-[11px] text-slate-500">
          Phân tích tọa độ vector theo từng trang hồ sơ ứng viên
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
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative font-['Be_Vietnam_Pro',sans-serif]">
      {/* TOOLBAR ĐIỀU KHIỂN TRÊN CÙNG */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 z-20 shrink-0 text-xs">
        {/* Thông tin số lượng khoanh vùng */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Khoanh vùng AI: <strong>{totalBoxesCount}</strong> vị trí</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500/60 border border-emerald-400" />
            <span>Kỹ năng Đạt</span>
            <span className="inline-block w-2.5 h-2.5 rounded bg-purple-500/60 border border-purple-400 ml-2" />
            <span>Chứng chỉ của ngành</span>
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

      {/* KHUNG CUỘN CHỨA CÁC TRANG PDF */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center gap-6 bg-slate-950/90 no-scrollbar"
      >
        {Array.from({ length: numPages }).map((_, index) => {
          const pageNum = index + 1;
          const pageData = pagesData.find((p) => p.pageNumber === pageNum);

          return (
            <div
              key={`page-${pageNum}`}
              className="relative shadow-2xl rounded-xl border border-slate-800 overflow-hidden bg-white shrink-0 group transition-all"
              style={{
                width: pageData ? pageData.width : undefined,
                height: pageData ? pageData.height : undefined,
              }}
            >
              {/* Thẻ đánh dấu số trang ở góc */}
              <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-300 font-mono pointer-events-none border border-slate-800">
                Trang {pageNum} / {numPages}
              </div>

              {/* Lớp Canvas vẽ nội dung PDF gốc */}
              <canvas
                ref={(el) => {
                  canvasRefs.current[index] = el;
                }}
                className="block pointer-events-none"
              />

              {/* LỚP PHỦ KHOANH VÙNG MÀU (HIGHLIGHT OVERLAY) */}
              {showHighlights && pageData && (
                <div className="absolute inset-0 pointer-events-none">
                  {pageData.boxes.map((box) => {
                    const isSkill = box.type === 'skill';
                    const isCert = box.type === 'cert';
                    const isActive =
                      Boolean(activeHighlightQuote) &&
                      (box.quote.toLowerCase().includes(activeHighlightQuote!.toLowerCase()) ||
                        activeHighlightQuote!.toLowerCase().includes(box.quote.toLowerCase()) ||
                        box.title.toLowerCase().includes(activeHighlightQuote!.toLowerCase()));

                    return (
                      <div
                        key={box.id}
                        ref={(el) => {
                          boxRefs.current[box.id] = el;
                        }}
                        onClick={() => onSelectQuote?.(box.quote)}
                        className={`absolute pointer-events-auto rounded cursor-pointer transition-all duration-300 group/box ${
                          isSkill
                            ? 'bg-emerald-500/25 border-2 border-emerald-400 hover:bg-emerald-500/40'
                            : isCert
                            ? 'bg-purple-500/25 border-2 border-purple-400 hover:bg-purple-500/40'
                            : 'bg-cyan-500/20 border-2 border-cyan-400 hover:bg-cyan-500/35'
                        } ${
                          isActive
                            ? 'ring-4 ring-amber-400/90 shadow-2xl shadow-amber-400/50 scale-[1.02] z-30 animate-pulse'
                            : 'z-10'
                        }`}
                        style={{
                          left: `${box.x}px`,
                          top: `${box.y}px`,
                          width: `${box.width}px`,
                          height: `${box.height}px`,
                        }}
                      >
                        {/* Huy hiệu mini nổi trên góc khung khoanh vùng */}
                        <div
                          className={`absolute -top-3.5 left-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold shadow-md whitespace-nowrap flex items-center gap-0.5 pointer-events-none ${
                            isSkill
                              ? 'bg-emerald-600 text-white'
                              : isCert
                              ? 'bg-purple-600 text-white'
                              : 'bg-cyan-600 text-white'
                          }`}
                        >
                          {isSkill ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <Award className="w-2.5 h-2.5" />
                          )}
                          <span>{isCert ? 'Chứng chỉ' : 'Kỹ năng'}: {box.title}</span>
                        </div>

                        {/* Tooltip khi rê chuột */}
                        <div className="opacity-0 group-hover/box:opacity-100 transition-opacity absolute bottom-full mb-1 left-0 z-40 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg shadow-xl text-[11px] pointer-events-none max-w-xs whitespace-normal">
                          <p className="font-bold text-white mb-0.5">
                            {isCert ? 'Chứng chỉ của ngành' : 'Kỹ năng đáp ứng JD'}: {box.title}
                          </p>
                          <p className="text-[10px] text-slate-400 italic">"{box.quote}"</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
