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
