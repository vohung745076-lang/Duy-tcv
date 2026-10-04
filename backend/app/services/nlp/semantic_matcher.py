import re
from typing import Dict, Any, List, Tuple, Optional

class SemanticMatcher:
    """
    Module NLP so khớp ngữ nghĩa và bóc tách thông tin tuyển dụng thực tế:
    - Xử lý kỹ năng ghép (ví dụ Power BI/Tableau, Docker/Kubernetes).
    - Trích xuất câu nguyên văn (raw quote) chính xác nhất từ ngữ cảnh CV.
    - Tự động bóc tách chứng chỉ nghề nghiệp quốc tế (Industry Certifications).
    - Tự động bóc tách giải thưởng và thành tích nổi bật ngoài JD.
    """

    # Danh mục các mẫu chứng chỉ quốc tế và chuyên ngành phổ biến
    KNOWN_CERTIFICATIONS = [
        {
            "id": "powerbi_assoc",
            "title": "Microsoft Certified: Data Analyst Associate (Power BI)",
            "keywords": ["data analyst associate", "power bi associate", "pl-300", "da-100"],
            "analysis": "Chứng chỉ chuyên sâu về mô hình hóa, trực quan hóa và khai thác dữ liệu từ Microsoft Power BI."
        },
        {
            "id": "ibm_da",
            "title": "IBM Professional Data Analyst Certificate",
            "keywords": ["ibm data analyst", "ibm certificate", "ibm professional data"],
            "analysis": "Chứng chỉ chuyên nghiệp toàn cầu của IBM về thu thập, làm sạch và phân tích dữ liệu thực chiến."
        },
        {
            "id": "google_da",
            "title": "Google Data Analytics Professional Certificate",
            "keywords": ["google data analytics", "google data analyst", "google analytics certificate"],
            "analysis": "Chứng chỉ phân tích dữ liệu chuyên nghiệp từ Google."
        },
        {
            "id": "azure_data",
            "title": "Microsoft Certified: Azure Data Fundamentals / Engineer",
            "keywords": ["azure data", "dp-900", "dp-203"],
            "analysis": "Chứng chỉ năng lực điện toán đám mây và kỹ thuật dữ liệu trên nền tảng Microsoft Azure."
        },
        {
            "id": "aws_da",
            "title": "AWS Certified Data Analytics / Cloud Practitioner",
            "keywords": ["aws certified", "aws data analytics", "aws solutions architect"],
            "analysis": "Chứng chỉ phân tích và kiến trúc dữ liệu đám mây trên hệ sinh thái Amazon Web Services."
        },
        {
            "id": "scrum_agile",
            "title": "Professional Scrum Master (PSM) / Agile Certified",
            "keywords": ["scrum master", "psm i", "psm ii", "agile certified"],
            "analysis": "Chứng nhận năng lực điều phối và quản trị dự án theo phương pháp Agile/Scrum."
        },
        {
            "id": "ielts_toeic",
            "title": "Chứng chỉ Ngoại ngữ Quốc tế (IELTS / TOEIC)",
            "keywords": ["ielts", "toeic", "toefl"],
            "analysis": "Năng lực giao tiếp và làm việc trong môi trường quốc tế chuyên nghiệp."
        }
    ]

    # Các mẫu giải thưởng và thành tích nổi bật ngoài JD
    AWARD_PATTERNS = [
        r'(employee\s+of\s+the\s+year[^\n.]*)',
        r'(nhân\s+viên\s+xuất\s+sắc[^\n.]*)',
        r'(giải\s+(?:nhất|nhì|ba|khuyến\s+khích)[^\n.]*hackathon[^\n.]*)',
        r'(hackathon[^\n.]*giải[^\n.]*)',
        r'(thủ\s+khoa[^\n.]*)',
        r'(tốt\s+nghiệp\s+loại\s+xuất\s+sắc[^\n.]*)',
        r'(top\s+\d+%[^\n.]*)',
    ]

    @classmethod
    def clean_skill_name(cls, raw_skill: str) -> str:
        """
        Làm sạch tên kỹ năng: loại bỏ tiền tố số thứ tự (ví dụ: '1. SQL' -> 'SQL',
        '2) Excel' -> 'Excel', '- Python' -> 'Python', '• Pandas' -> 'Pandas').
        """
        if not raw_skill:
            return ""
        # Loại bỏ các mẫu tiền tố: số thứ tự (1., 2), (3), 4:) hoặc gạch đầu dòng (-, *, •, +)
        cleaned = re.sub(r'^\s*(?:\(?\d+[\.\)\-:]+|\d+\s*[-:]+|[\-\*•\+]+)\s*', '', raw_skill)
        return cleaned.strip(' ;.,')

    @classmethod
    def find_best_quote(cls, text: str, keyword: str) -> str:
        """Tìm câu hoặc đoạn trích dẫn súc tích, sạch sẽ nhất chứa từ khóa (tối ưu 40-160 ký tự)."""
        if not text or not keyword:
            return ""

        clean_kw = cls.clean_skill_name(keyword) or keyword.strip()
        kw_clean = clean_kw.strip().lower()
        if not kw_clean or kw_clean not in text.lower():
            return ""

        # 1. Tách theo các ranh giới tự nhiên: xuống dòng, bullet, hoặc các cụm danh mục thường gặp
        header_split = re.split(r'[\r\n•\*\+\t|]+', text)
        segments = []
        for seg in header_split:
            s = seg.strip()
            if not s:
                continue
            if len(s) > 160:
                # Tách theo các nhãn thường gặp như 'Frameworks', 'Cơ sở dữ liệu', 'Kiến trúc', 'DevOps', 'HỌC VẤN', 'CHỨNG CHỈ', 'TÓM TẮT' hoặc chấm/phẩy
                sub_parts = re.split(r'(?=(?:Frameworks|Cơ sở dữ liệu|Kiến trúc|DevOps|HỌC VẤN|CHỨNG CHỈ|TÓM TẮT|KINH NGHIỆM|DỰ ÁN|KỸ NĂNG|[.;]))', s)
                for sp in sub_parts:
                    sp_clean = sp.strip(' ;.')
                    if len(sp_clean) > 3:
                        segments.append(sp_clean)
            else:
                segments.append(s)

        # 2. Tìm segment ngắn gọn chứa từ khóa
        best_candidate = ""
        for seg in segments:
            if kw_clean in seg.lower():
                cleaned = re.sub(r'^[-\s*•#]+', '', seg).strip(' ;.')
                if len(cleaned) <= 160:
                    return cleaned
                elif not best_candidate or len(cleaned) < len(best_candidate):
                    best_candidate = cleaned

        if best_candidate:
            kw_idx = best_candidate.lower().find(kw_clean)
            if kw_idx != -1:
                start = max(0, kw_idx - 40)
                end = min(len(best_candidate), kw_idx + len(kw_clean) + 55)
                snippet = best_candidate[start:end].strip(' ,;.')
                if start > 0:
                    snippet = "..." + snippet
                if end < len(best_candidate):
                    snippet = snippet + "..."
                return snippet
            return best_candidate[:150] + "..."

        # 3. Fallback: Trích xuất cửa sổ quanh từ khóa
        idx = text.lower().find(kw_clean)
        if idx != -1:
            start = max(0, idx - 40)
            end = min(len(text), idx + len(kw_clean) + 55)
            snippet = text[start:end].strip()
            return re.sub(r'\s+', ' ', snippet)

        return ""

    @classmethod
    def match_skill(cls, cv_text: str, skill_name: str) -> Tuple[bool, str, str]:
        """
        So khớp một kỹ năng với văn bản CV:
        Hỗ trợ kỹ năng đơn ("SQL", "Python") hoặc kỹ năng ghép ("Power BI/Tableau", "Docker, Redis").
        Tự động làm sạch tiền tố số thứ tự như "1. SQL" -> tìm kiếm "SQL".
        Trả về: (is_matched: bool, matched_part: str, raw_quote: str)
        """
        if not cv_text or not skill_name:
            return False, "", ""

        cv_lower = cv_text.lower()
        cleaned_skill = cls.clean_skill_name(skill_name)
        target_name = cleaned_skill if cleaned_skill else skill_name.strip()

        # Tách các thành phần của kỹ năng ghép (ví dụ "Power BI / Tableau" hoặc "Docker, Kubernetes")
        raw_parts = [p.strip() for p in re.split(r'[/,|+]', target_name) if len(p.strip()) > 0]
        parts = []
        for p in raw_parts:
            cp = cls.clean_skill_name(p)
            if cp and len(cp) >= 1:
                parts.append(cp)

        if not parts:
            parts = [target_name]

        for part in parts:
            part_lower = part.lower()

            # Tạo pattern nhận diện từ biên (Word boundary) linh hoạt
            # Cho phép khoảng trắng hoặc gạch ngang linh hoạt (ví dụ "Power BI" hoặc "Power-BI" hoặc "PowerBI")
            pattern_str = re.escape(part_lower).replace(r'\ ', r'[\s\-_]?')
            pattern = re.compile(rf'\b{pattern_str}\b', re.IGNORECASE)

            if pattern.search(cv_lower) or part_lower in cv_lower:
                quote = cls.find_best_quote(cv_text, part) or cls.find_best_quote(cv_text, part_lower)
                return True, part, quote

        return False, "", ""

    @classmethod
    def extract_industry_certifications(cls, cv_text: str) -> List[Dict[str, Any]]:
        """Tự động bóc tách các chứng chỉ chuyên môn quốc tế từ nội dung CV."""
        found_certs = []
        if not cv_text:
            return found_certs

        cv_lower = cv_text.lower()

        for cert_def in cls.KNOWN_CERTIFICATIONS:
            matched_kw = None
            for kw in cert_def["keywords"]:
                if kw.lower() in cv_lower:
                    matched_kw = kw
                    break

            if matched_kw:
                quote = cls.find_best_quote(cv_text, matched_kw)
                found_certs.append({
                    "category": "Chứng chỉ của ngành",
                    "title": cert_def["title"],
                    "raw_quote": quote or f"Chứng chỉ {cert_def['title']} được ghi nhận trong CV.",
                    "value_add_analysis": cert_def["analysis"],
                    "is_international": True
                })

        return found_certs

    @classmethod
    def extract_awards_and_extras(cls, cv_text: str, excluded_quotes: List[str]) -> List[Dict[str, Any]]:
        """Tự động bóc tách giải thưởng, thành tích thặng dư mang lại giá trị gia tăng."""
        extras = []
        if not cv_text:
            return extras

        excluded_lower = [q.lower() for q in excluded_quotes if q]

        # 1. Tìm các giải thưởng và danh hiệu
        for pat in cls.AWARD_PATTERNS:
            matches = re.finditer(pat, cv_text, re.IGNORECASE)
            for m in matches:
                matched_str = m.group(1).strip()
                if len(matched_str) > 5 and not any(matched_str.lower() in ex for ex in excluded_lower):
                    extras.append({
                        "category": "Giải thưởng & Thành tích",
                        "title": matched_str.split('\n')[0].strip(),
                        "raw_quote": matched_str,
                        "value_add_analysis": "Thành tích thực tế phản ánh tinh thần cống hiến và năng lực vượt trội của ứng viên."
                    })
                    excluded_lower.append(matched_str.lower())

        return extras

semantic_matcher = SemanticMatcher()
