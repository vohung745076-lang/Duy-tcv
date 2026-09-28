import { createWorker, type Worker } from 'tesseract.js';

export interface OCRBoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: OCRBoundingBox;
}

export interface OCRLine {
  text: string;
  confidence: number;
  bbox: OCRBoundingBox;
  words: OCRWord[];
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
}

class OCRService {
  private worker: Worker | null = null;
  private initializingPromise: Promise<Worker> | null = null;

  private async getWorker(onProgress?: (progress: number, status: string) => void): Promise<Worker> {
    if (this.worker) return this.worker;

    if (!this.initializingPromise) {
      this.initializingPromise = (async () => {
        try {
          const worker = await createWorker(['vie', 'eng'], undefined, {
            logger: (m) => {
              if (onProgress && m.status) {
                const pct = typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0;
                let statusMsg = 'Đang khởi tạo bộ máy OCR...';
                if (m.status === 'loading tesseract core') statusMsg = 'Đang nạp lõi WebAssembly OCR...';
                else if (m.status === 'loading language traineddata') statusMsg = 'Đang nạp từ điển tiếng Việt...';
                else if (m.status === 'initializing api') statusMsg = 'Đang cấu hình AI nhận diện...';
                else if (m.status === 'recognizing text') statusMsg = `Đang bóc tách ký tự (${pct}%)...`;
                onProgress(pct, statusMsg);
              }
            },
          });
          this.worker = worker;
          return worker;
        } catch (err) {
          this.initializingPromise = null;
          throw err;
        }
      })();
    }

    return this.initializingPromise;
  }

  /**
   * Thực hiện nhận diện ký tự quang học (OCR) trên thẻ Canvas của trang PDF
   */
  public async recognizeCanvas(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number, status: string) => void
  ): Promise<OCRResult> {
    const worker = await this.getWorker(onProgress);

    const ret = await worker.recognize(canvas, {}, { blocks: true, text: true });
    const data = ret.data;

    const words: OCRWord[] = [];
    const lines: OCRLine[] = [];

    if (data.blocks) {
      for (const block of data.blocks) {
        if (block.paragraphs) {
          for (const para of block.paragraphs) {
            if (para.lines) {
              for (const l of para.lines) {
                const lineWords: OCRWord[] = (l.words || [])
                  .map((w: any) => ({
                    text: (w.text || '').trim(),
                    confidence: w.confidence || 0,
                    bbox: {
                      x0: w.bbox?.x0 ?? 0,
                      y0: w.bbox?.y0 ?? 0,
                      x1: w.bbox?.x1 ?? 0,
                      y1: w.bbox?.y1 ?? 0,
                    },
                  }))
                  .filter((w) => w.text.length > 0);

                words.push(...lineWords);

                lines.push({
                  text: (l.text || '').trim(),
                  confidence: l.confidence || 0,
                  bbox: {
                    x0: l.bbox?.x0 ?? 0,
                    y0: l.bbox?.y0 ?? 0,
                    x1: l.bbox?.x1 ?? 0,
                    y1: l.bbox?.y1 ?? 0,
                  },
                  words: lineWords,
                });
              }
            }
          }
        }
      }
    }

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      lines,
      words,
    };
  }

  /**
   * Giải phóng tài nguyên Web Worker khi không dùng đến
   */
  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initializingPromise = null;
    }
  }
}

export const ocrService = new OCRService();
