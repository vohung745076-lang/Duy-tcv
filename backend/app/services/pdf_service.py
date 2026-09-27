import os
import pdfplumber
from pypdf import PdfReader

class PDFService:
    @staticmethod
    def _extract_via_pdfplumber(file_path: str) -> str:
        """Trích xuất bằng pdfplumber kết hợp phát hiện 2 cột và nhóm từ."""
        pages_text = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    p_text = ""
                    # 1. Thử extract_text tiêu chuẩn
                    raw = page.extract_text(layout=False, x_tolerance=3, y_tolerance=3)
                    if raw and len(raw.strip()) > 30:
                        p_text = raw
                    else:
                        # 2. Thử layout=True
                        raw_layout = page.extract_text(layout=True)
                        if raw_layout and len(raw_layout.strip()) > 30:
                            p_text = raw_layout

                    # 3. Nếu vẫn rỗng hoặc quá ngắn, trích xuất bằng extract_words
                    if not p_text or len(p_text.strip()) < 30:
                        words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
                        if words:
                            # Kiểm tra xem có bố cục 2 cột không (TopCV / Canva thường chia cột ở khoảng 35%-45% bề ngang)
                            w_width = page.width or 600
                            col_split = w_width * 0.38
                            left_col_words = [w for w in words if w['x1'] <= col_split + 20]
                            right_col_words = [w for w in words if w['x0'] >= col_split - 10]

                            if len(left_col_words) > 10 and len(right_col_words) > 10:
                                # Sắp xếp cột trái: theo top, rồi x0
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
            pass

        return "\n\n".join(pages_text).strip()

    @staticmethod
    def _extract_via_pypdf(file_path: str) -> str:
        """Trích xuất bằng pypdf làm phương án độc lập."""
        pages_text = []
        try:
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
        Trích xuất toàn bộ văn bản từ file PDF đa phương thức.
        So sánh kết quả giữa pdfplumber và pypdf để chọn bản dịch tối ưu và đầy đủ chữ nhất.
        """
        if not os.path.exists(file_path):
            return "[File PDF không tồn tại trên hệ thống]"

        text_plumber = cls._extract_via_pdfplumber(file_path)
        text_pypdf = cls._extract_via_pypdf(file_path)

        # Chọn bản trích xuất có độ dài và số lượng từ phong phú hơn
        selected = text_plumber if len(text_plumber) >= len(text_pypdf) else text_pypdf

        if not selected or len(selected.strip()) < 10:
            return "[Hồ sơ CV dạng scan ảnh / đồ họa không chứa text layer - Hệ thống kích hoạt cơ chế nhận diện đa phương thức hoặc HR đối soát trực quan qua PDF]"

        return selected

pdf_service = PDFService()
