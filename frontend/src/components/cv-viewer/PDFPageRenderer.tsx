import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { CheckCircle2, Award, Sparkles } from 'lucide-react';

export interface HighlightBox {
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

export interface SearchTarget {
  type: 'skill' | 'cert' | 'exp' | 'edu';
  title: string;
  quote: string;
  keywords: string[];
}

interface PDFPageRendererProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  numPages: number;
  scale: number;
  showHighlights: boolean;
  searchTargets: SearchTarget[];
  activeHighlightQuote: string | null;
  onSelectQuote?: (quote: string) => void;
  onPageBoxesCalculated?: (pageNumber: number, boxes: HighlightBox[]) => void;
}

export const PDFPageRenderer: React.FC<PDFPageRendererProps> = ({
  pdfDoc,
  pageNumber,
  numPages,
  scale,
  showHighlights,
  searchTargets,
  activeHighlightQuote,
  onSelectQuote,
  onPageBoxesCalculated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [boxes, setBoxes] = useState<HighlightBox[]>([]);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        setRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Xóa hoặc hủy tác vụ render đang chạy dở
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // bỏ qua lỗi hủy task
          }
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        } as any);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isCancelled) return;

        // Trích xuất text content của trang này để định vị highlight
        const textContent = await page.getTextContent();
        if (isCancelled) return;

        const items = textContent.items as any[];
        const pageFullText = items.map((it) => it.str).join(' ');
        const pageFullTextLower = pageFullText.toLowerCase();

        const calculatedBoxes: HighlightBox[] = [];

        for (const target of searchTargets) {
          for (const kw of target.keywords) {
            if (!kw || kw.length < 2) continue;
            const kwLower = kw.toLowerCase().trim();

            if (pageFullTextLower.includes(kwLower)) {
              const matchingItems = items.filter((it) => {
                const strLower = (it.str || '').toLowerCase();
                return strLower.includes(kwLower);
              });

              if (matchingItems.length > 0) {
                // Nhóm theo dòng (Y-axis) để hộp khoanh vùng gọn gàng bám đúng dòng chữ
                const firstItem = matchingItems[0];
                const [, firstVy] = viewport.convertToViewportPoint(firstItem.transform[4], firstItem.transform[5]);
                const lineItems = matchingItems.filter((it) => {
                  const [, vy] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
                  return Math.abs(vy - firstVy) < 22 * scale;
                });

                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;

                for (const it of lineItems) {
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

                const padX = 5;
                const padY = 3;
                const boxW = Math.max(maxX - minX + padX * 2, 35);
                const boxH = Math.max(maxY - minY + padY * 2, 16);
                const boxX = Math.max(minX - padX, 2);
                const boxY = Math.max(minY - padY, 2);

                const boxId = `box-p${pageNumber}-${target.type}-${target.title.replace(/\s+/g, '_')}`;

                if (!calculatedBoxes.some((b) => b.title === target.title)) {
                  calculatedBoxes.push({
                    id: boxId,
                    pageIndex: pageNumber,
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
                break; // Đã tìm thấy vị trí khớp cho tiêu chí này trên trang
              }
            }
          }
        }

        setBoxes(calculatedBoxes);
        onPageBoxesCalculated?.(pageNumber, calculatedBoxes);
      } catch (err: any) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.error(`Lỗi render trang ${pageNumber}:`, err);
        }
      } finally {
        if (!isCancelled) {
          setRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale, searchTargets]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative shadow-2xl rounded-xl border border-slate-800 overflow-hidden bg-white shrink-0 group transition-all"
      style={{
        width: dimensions ? dimensions.width : undefined,
        height: dimensions ? dimensions.height : undefined,
        minHeight: dimensions ? undefined : '500px',
        minWidth: dimensions ? undefined : '400px',
      }}
    >
      {/* Thẻ đánh dấu số trang ở góc */}
      <div className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-md bg-slate-900/85 backdrop-blur-md text-[10px] text-slate-200 font-mono pointer-events-none border border-slate-700 shadow-md">
        Trang {pageNumber} / {numPages}
      </div>

      {/* Lớp Canvas vẽ nội dung PDF gốc */}
      <canvas ref={canvasRef} className="block pointer-events-none" />

      {/* LỚP PHỦ KHOANH VÙNG MÀU (HIGHLIGHT OVERLAY) */}
      {showHighlights && !rendering && (
        <div className="absolute inset-0 pointer-events-none">
          {boxes.map((box) => {
            const isSkill = box.type === 'skill';
            const isCert = box.type === 'cert';
            const isActive =
              Boolean(activeHighlightQuote) &&
              (box.quote.toLowerCase().includes(activeHighlightQuote!.toLowerCase()) ||
                activeHighlightQuote!.toLowerCase().includes(box.quote.toLowerCase()) ||
                box.title.toLowerCase().includes(activeHighlightQuote!.toLowerCase()) ||
                activeHighlightQuote!.toLowerCase().includes(box.title.toLowerCase()));

            return (
              <div
                key={box.id}
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
                  ) : isCert ? (
                    <Award className="w-2.5 h-2.5" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                  <span>{box.title}</span>
                </div>

                {/* Tooltip hiển thị câu trích dẫn khi rê chuột */}
                <div className="hidden group-hover/box:flex flex-col absolute bottom-full left-0 mb-2 p-2 rounded-lg bg-slate-900/95 text-slate-100 text-[10px] w-64 max-w-xs shadow-2xl border border-slate-700 pointer-events-none z-40 backdrop-blur-md">
                  <span className="font-bold text-amber-300 mb-0.5">{box.title}</span>
                  <p className="italic text-slate-300">"{box.quote}"</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
