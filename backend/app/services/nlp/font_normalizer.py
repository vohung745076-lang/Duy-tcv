import re
import unicodedata
from typing import Optional

class FontNormalizer:
    """
    Module NLP chuẩn hóa văn bản và giải mã các lỗi font chữ trong tài liệu PDF:
    - Chuẩn hóa Unicode dạng chuẩn dựng sẵn (NFC).
    - Khử các mã ký tự đồ họa / Private Use Area (PUA) như bullet icons \uf0b7, \ue000...
    - Khôi phục khoảng trắng và dấu ngắt dòng bị biến dạng do kerning font.
    - Xử lý các từ bị đứt đoạn bởi dấu gạch nối (de-hyphenation).
    """

    # Danh mục các ký tự Private Use Area và bullet thường dùng trong Canva / TopCV
    PUA_BULLET_PATTERN = re.compile(r'[\uf0b7\uf0a7\uf0d8\uf0a8\ue000-\uf8ff\u25aa\u25ab\u25cf\u25cb\u25c6\u25c7]')

    # Danh mục khoảng trắng vô hình hoặc khoảng trắng đặc biệt
    ODD_WHITESPACE_PATTERN = re.compile(r'[\u00a0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]')

    @classmethod
    def normalize(cls, text: Optional[str]) -> str:
        """Thực hiện chu trình chuẩn hóa toàn diện trên văn bản CV."""
        if not text:
            return ""

        # 1. Chuẩn hóa Unicode sang NFC (hợp nhất các dấu thanh tiếng Việt rời rạc)
        text = unicodedata.normalize('NFC', text)

        # 2. Chuyển đổi các ký tự bullet/icon đồ họa lỗi font thành dấu bullet chuẩn '•'
        text = cls.PUA_BULLET_PATTERN.sub(' • ', text)

        # 3. Chuẩn hóa các loại khoảng trắng dị thường thành dấu cách tiêu chuẩn
        text = cls.ODD_WHITESPACE_PATTERN.sub(' ', text)

        # 4. Thay thế các dấu gạch ngang đặc thù thành dấu gạch nối tiêu chuẩn '-'
        text = re.sub(r'[\u2010\u2011\u2012\u2013\u2014\u2015]', '-', text)

        # 5. Khử dấu ngắt dòng gạch nối (de-hyphenation: ví dụ "devel-\noper" -> "developer")
        text = re.sub(r'(\b[A-Za-zÀ-Ỹà-ỹ]+)-\s*\n\s*([A-Za-zÀ-Ỹà-ỹ]+\b)', r'\1\2', text)

        # 6. Chuẩn hóa khoảng trắng ngang (không làm mất dấu xuống dòng \n)
        lines = []
        for line in text.splitlines():
            cleaned_line = re.sub(r'[ \t]+', ' ', line).strip()
            lines.append(cleaned_line)

        # 7. Hợp nhất các dòng trống liên tiếp (tối đa 2 dòng trống liên tiếp)
        result = "\n".join(lines)
        result = re.sub(r'\n{3,}', '\n\n', result)

        return result.strip()

font_normalizer = FontNormalizer()
