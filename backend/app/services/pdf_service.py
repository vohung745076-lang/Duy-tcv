import os
import logging
from typing import Optional
from app.services.nlp.font_normalizer import font_normalizer

logger = logging.getLogger(__name__)

class PDFService:
    @staticmethod
    def _extract_via_pymupdf(file_path: str) -> str:
        """
        Trích xuất văn bản chất lượng cao bằng PyMuPDF (fitz C-Engine):
        - Giải mã toàn bộ font chữ nhúng (CID, Type3, Identity-H).
        - Phân tích khối văn bản (blocks) nhận diện bố cục 2 cột tự nhiên.
        """
        pages_text = []
        try:
            import pymupdf
            doc = pymupdf.open(file_path)
            for page_idx, page in enumerate(doc):
                # Lấy danh sách các khối (blocks): (x0, y0, x1, y1, text, block_no, block_type)
                blocks = page.get_text("blocks")
                text_blocks = [b for b in blocks if len(b) >= 5 and b[4].strip() and b[6] == 0]

                if not text_blocks:
                    # Thử lấy văn bản thô trực tiếp nếu không phân chia được blocks
                    raw_page_text = page.get_text("text").strip()
                    if raw_page_text:
                        pages_text.append(f"--- Page {page_idx + 1} ---\n{raw_page_text}")
                    continue

                page_width = page.rect.width
                col_split = page_width * 0.40

                # Kiểm tra xem có cấu trúc 2 cột không
                left_blocks = [b for b in text_blocks if b[2] <= col_split + 30]
                right_blocks = [b for b in text_blocks if b[0] >= col_split - 20]

                if len(left_blocks) >= 2 and len(right_blocks) >= 2:
                    # Sắp xếp theo thứ tự đọc: Cột trái từ trên xuống dưới, sau đó Cột phải
                    left_blocks.sort(key=lambda b: (b[1], b[0]))
                    right_blocks.sort(key=lambda b: (b[1], b[0]))
                    left_text = "\n".join([b[4].strip() for b in left_blocks])
                    right_text = "\n".join([b[4].strip() for b in right_blocks])
                    page_content = f"{left_text}\n\n{right_text}"
                else:
                    # Sắp xếp thông thường từ trên xuống dưới
                    text_blocks.sort(key=lambda b: (b[1], b[0]))
                    page_content = "\n".join([b[4].strip() for b in text_blocks])

                if page_content.strip():
                    pages_text.append(f"--- Page {page_idx + 1} ---\n{page_content.strip()}")
            doc.close()
        except ImportError:
            logger.info("PyMuPDF chưa được nạp, chuyển sang fallback.")
        except Exception as e:
            logger.warning(f"Lỗi khi trích xuất bằng PyMuPDF: {e}")

        return "\n\n".join(pages_text).strip()

    @staticmethod
    def _extract_via_pdfplumber(file_path: str) -> str:
        """Trích xuất dự phòng bằng pdfplumber kết hợp phát hiện 2 cột và nhóm từ."""
        pages_text = []
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    p_text = ""
                    raw = page.extract_text(layout=False, x_tolerance=3, y_tolerance=3)
                    if raw and len(raw.strip()) > 30:
                        p_text = raw
                    else:
                        raw_layout = page.extract_text(layout=True)
                        if raw_layout and len(raw_layout.strip()) > 30:
                            p_text = raw_layout

                    if not p_text or len(p_text.strip()) < 30:
                        words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
                        if words:
                            w_width = page.width or 600
                            col_split = w_width * 0.38
                            left_col_words = [w for w in words if w['x1'] <= col_split + 20]
                            right_col_words = [w for w in words if w['x0'] >= col_split - 10]

                            if len(left_col_words) > 10 and len(right_col_words) > 10:
                                left_col_words.sort(key=lambda w: (round(w['top'] / 10), w['x0']))
                                right_col_words.sort(key=lambda w: (round(w['top'] / 10), w['x0']))
                                left_text = " ".join([w['text'] for w in left_col_words])
                                right_text = " ".join([w['text'] for w in right_col_words])
                                p_text = f"{left_text}\n\n{right_text}"
                            else:
                                words.sort(key=lambda w: (round(w['top'] / 10), w['x0']))
                                p_text = " ".join([w['text'] for w in words])

                    if p_text and p_text.strip():
                        pages_text.append(f"--- Page {page_idx + 1} ---\n{p_text.strip()}")
        except Exception as e:
            logger.debug(f"pdfplumber exception: {e}")

        return "\n\n".join(pages_text).strip()

    @staticmethod
    def _extract_via_pypdf(file_path: str) -> str:
        """Trích xuất bằng pypdf làm phương án độc lập thứ ba."""
        pages_text = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page_idx, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages_text.append(f"--- Page {page_idx + 1} ---\n{text.strip()}")
        except Exception:
            pass
        return "\n\n".join(pages_text).strip()

    @classmethod
    def extract_text(cls, file_path: str) -> str:
        """
        Trích xuất toàn bộ văn bản từ file PDF đa phương thức (PyMuPDF -> pdfplumber -> pypdf),
        sau đó đưa qua module NLP FontNormalizer để chuẩn hóa Unicode và khử lỗi font chữ.
        """
        if not os.path.exists(file_path):
            return "[File PDF không tồn tại trên hệ thống]"

        # 1. Thử nghiệm C-Engine PyMuPDF trước tiên (khả năng giải mã font tốt nhất)
        text_mupdf = cls._extract_via_pymupdf(file_path)

        # 2. Thử nghiệm pdfplumber và pypdf
        text_plumber = cls._extract_via_pdfplumber(file_path)
        text_pypdf = cls._extract_via_pypdf(file_path)

        # Chọn kết quả bóc tách có số lượng ký tự phong phú nhất
        candidates = [text_mupdf, text_plumber, text_pypdf]
        selected = max(candidates, key=lambda t: len(t.strip()) if t else 0)

        # 3. Chuẩn hóa font chữ qua NLP FontNormalizer
        normalized = font_normalizer.normalize(selected)

        if not normalized or len(normalized.strip()) < 10:
            return "[Hồ sơ CV dạng scan ảnh / đồ họa không chứa text layer - Hệ thống kích hoạt cơ chế nhận diện đa phương thức hoặc HR đối soát trực quan qua PDF]"

        return normalized

    @classmethod
    def create_pdf_from_text(cls, title: str, text: str) -> bytes:
        """
        Tạo luồng byte PDF tiêu chuẩn từ văn bản thuần túy (hỗ trợ đầy đủ tiếng Việt có dấu qua PyMuPDF Story).
        Được dùng làm fallback khi hồ sơ gốc là DOCX hoặc file PDF bị thiếu/hỏng.
        """
        import io
        import html
        try:
            import pymupdf
            bio = io.BytesIO()
            writer = pymupdf.DocumentWriter(bio)
            safe_title = html.escape(title or "Hồ sơ ứng viên")
            safe_text = html.escape(text or "Không có nội dung văn bản.")
            html_content = (
                '<html><body style="font-family: sans-serif; padding: 12px; color: #1e293b;">'
                '<div style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px;">'
                f'<h2 style="color: #1e3a8a; margin: 0 0 4px 0;">{safe_title}</h2>'
                '<span style="font-size: 11px; color: #64748b;">Bản chuyển đổi PDF xem trực tiếp từ văn bản CV</span>'
                '</div>'
                f'<pre style="font-family: sans-serif; font-size: 11px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">{safe_text}</pre>'
                '</body></html>'
            )
            story = pymupdf.Story(html=html_content)
            more = 1
            while more:
                device = writer.begin_page(pymupdf.Rect(0, 0, 595, 842))
                more, _ = story.place(pymupdf.Rect(40, 40, 555, 802))
                story.draw(device)
                writer.end_page()
            writer.close()
            return bio.getvalue()
        except Exception as e:
            logger.error(f"Lỗi khi tạo PDF từ văn bản: {e}")
            try:
                import pymupdf
                doc = pymupdf.open()
                page = doc.new_page(width=595, height=842)
                page.insert_textbox(pymupdf.Rect(40, 40, 555, 802), f"{title}\n\n{text[:2000]}")
                return doc.tobytes()
            except Exception:
                return b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"

pdf_service = PDFService()
