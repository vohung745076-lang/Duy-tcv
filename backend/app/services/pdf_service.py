import os
import pdfplumber
from pypdf import PdfReader

class PDFService:
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Trích xuất toàn bộ văn bản từ file PDF."""
        text_content = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(f"--- Page {page_idx + 1} ---\n{page_text}")
        except Exception as e:
            # Fallback sang pypdf nếu pdfplumber gặp vấn đề
            try:
                reader = PdfReader(file_path)
                for page_idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(f"--- Page {page_idx + 1} ---\n{page_text}")
            except Exception as fallback_err:
                return f"[Hồ sơ PDF dạng đặc biệt - Đã lưu bản sao gốc để HR xem: {str(fallback_err)}]"

        full_text = "\n\n".join(text_content).strip()
        if not full_text:
            return "[Hồ sơ CV dạng đồ họa / Canva / Scan ảnh - Đã lưu trữ bản sao PDF gốc đầy đủ để Hội đồng HR thẩm định trực tiếp]"
        return full_text

pdf_service = PDFService()
