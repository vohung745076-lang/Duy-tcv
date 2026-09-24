import re

class PIIService:
    def __init__(self):
        # RegEx cho số điện thoại VN và quốc tế
        self.phone_pattern = re.compile(r'(\+?84|0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b')
        # RegEx cho email
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        # RegEx cho ngày sinh
        self.dob_pattern = re.compile(r'\b(0[1-9]|[12][0-9]|3[01])[-/.](0[1-9]|1[012])[-/.](19|20)\d\d\b')
        # RegEx cho CMND/CCCD
        self.id_card_pattern = re.compile(r'\b\d{9}\b|\b\d{12}\b')

    def extract_name(self, raw_text: str, filename: str = "") -> str:
        """Trích xuất tên thật của ứng viên từ văn bản CV hoặc tên file PDF."""
        # 1. Quét theo các nhãn Họ tên phổ biến trong CV
        name_patterns = [
            r'(?:họ\s*(?:và|&)?\s*tên|họ\s*tên|full\s*name|candidate\s*name|họ\s*tên\s*ứng\s*viên)\s*[:：\-]\s*([A-Za-zÀ-Ỹà-ỹ\s]{2,40})',
            r'(?:ứng\s*viên|hồ\s*sơ\s*của)\s*[:：\-]\s*([A-Za-zÀ-Ỹà-ỹ\s]{2,40})',
        ]
        for pat in name_patterns:
            match = re.search(pat, raw_text, re.IGNORECASE)
            if match:
                cand_name = match.group(1).strip()
                cand_name = re.split(r'[\n\r,;|/]', cand_name)[0].strip()
                if len(cand_name.split()) >= 2 and len(cand_name) <= 35:
                    return cand_name.title()

        # 2. Quét các dòng đầu của CV (dòng 0..5) tìm dòng chỉ chứa Họ và Tên (2-5 từ)
        ignore_keywords = [
            "curriculum", "vitae", "resume", "page", "phone", "email", "skills",
            "education", "kinh nghiệm", "kỹ năng", "học vấn", "mục tiêu", "thông tin",
            "developer", "engineer", "designer", "intern", "manager", "chuyên viên"
        ]
        if raw_text:
            lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
            for line in lines[:6]:
                cleaned_line = re.sub(r'^[-\s*•#]+', '', line).strip()
                if any(kw in cleaned_line.lower() for kw in ignore_keywords) or "@" in cleaned_line:
                    continue
                words = cleaned_line.split()
                if 2 <= len(words) <= 5 and re.match(r'^[A-Za-zÀ-Ỹà-ỹ\s]+$', cleaned_line) and len(cleaned_line) <= 35:
                    return cleaned_line.title()

        # 3. Trích xuất từ tên file PDF (ví dụ: CV_Nguyen_Van_A.pdf -> Nguyen Van A)
        if filename:
            name_from_file = filename
            name_from_file = re.sub(r'\.pdf$', '', name_from_file, flags=re.IGNORECASE)
            name_from_file = re.sub(r'^(?:cv|resume|hoso|profile)[\s_\-]*', '', name_from_file, flags=re.IGNORECASE)
            name_from_file = re.sub(r'[\s_\-]*(?:cv|resume|pdf)$', '', name_from_file, flags=re.IGNORECASE)
            name_from_file = re.sub(r'[_\-]+', ' ', name_from_file).strip()
            name_from_file = re.sub(r'^\d+\s*', '', name_from_file).strip()

            words = name_from_file.split()
            if len(words) >= 2 and re.match(r'^[A-Za-zÀ-Ỹà-ỹ\s]+$', name_from_file):
                return name_from_file.title()
            elif len(name_from_file) >= 3 and not name_from_file.isdigit():
                return name_from_file.title()

        return ""

    def extract_contact_info(self, raw_text: str, filename: str = "") -> dict:
        """Trích xuất tự động Tên, Email, SĐT từ nội dung CV và tên file."""
        email = None
        phone = None

        if raw_text:
            email_match = self.email_pattern.search(raw_text)
            if email_match:
                email = email_match.group(0).strip()

            phone_match = self.phone_pattern.search(raw_text)
            if phone_match:
                phone = phone_match.group(0).strip()

        name = self.extract_name(raw_text, filename)

        return {
            "name": name,
            "email": email,
            "phone": phone
        }

    def mask_text(self, text: str) -> str:
        """Che mờ các thông tin nhạy cảm trong văn bản CV."""
        if not text:
            return ""

        masked = text
        # Che email
        masked = self.email_pattern.sub("[MASKED_EMAIL]", masked)
        # Che số điện thoại
        masked = self.phone_pattern.sub("[MASKED_PHONE]", masked)
        # Che ngày sinh
        masked = self.dob_pattern.sub("[MASKED_DOB]", masked)
        # Che CMND / CCCD
        masked = self.id_card_pattern.sub("[MASKED_ID]", masked)

        return masked

pii_service = PIIService()
