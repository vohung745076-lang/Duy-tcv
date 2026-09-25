import json
import logging
import requests
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là chuyên gia thẩm định hồ sơ tuyển dụng và đối soát nhân sự cao cấp (AI Copilot).
Nhiệm vụ của bạn là phân tích văn bản CV đã được che mờ thông tin cá nhân (Masked CV Text) đối chiếu chặt chẽ với Bản mô tả công việc (Job Description Criteria).

QUY TẮC BẮT BUỘC (ĐỐI SOÁT CHUYÊN SÂU & XÉT KỸ):
1. ĐỐI SOÁT TIÊU CHÍ KHỚP (MATCHED CRITERIA - XANH LÁ):
   - Mọi tiêu chí bắt buộc hoặc ưu tiên nếu được đánh giá `matched: true` BẮT BUỘC phải có `raw_quote` là câu nguyên văn chính xác xuất hiện trong CV.
   - Giải thích cặn kẽ tại sao câu trích dẫn chứng minh ứng viên đạt tiêu chuẩn (kinh nghiệm thực chiến, công nghệ tương đương, thời gian làm việc).

2. TỰ ĐỘNG BÓC TÁCH VÙNG NÊU THÊM (ADDITIONAL HIGHLIGHTS - XANH DƯƠNG / TÍM):
   - Quét kỹ toàn bộ CV để tìm các kỹ năng, công nghệ, chứng chỉ quốc tế (AWS, Azure, GCP, PMP, Scrum, IELTS, TOEIC...), kinh nghiệm dự án đặc thù hoặc thành tích mà ứng viên SỞ HỮU NHƯNG KHÔNG CÓ TRONG YÊU CẦU CỦA JD.
   - Trích dẫn câu nguyên văn (`raw_quote`), phân loại danh mục (`category`), đặt tiêu đề (`title`), và phân tích giá trị thặng dư (`value_add_analysis`) mà điểm mạnh này đem lại cho doanh nghiệp.

3. ĐIỂM THIẾU HỤT & KHOẢNG TRỐNG (MISSING GAPS - ĐỎ / HỔ PHÁCH):
   - Nếu tiêu chí không có trong CV, ghi `matched: false`, `raw_quote: ""` và giải thích rõ khoảng trống cần làm rõ.

4. GỢI Ý CÂU HỎI PHỎNG VẤN CHUYÊN SÂU (`interview_questions`):
   - Sinh 3-5 câu hỏi phỏng vấn thực chiến: 
     + Xoáy sâu vào các khoảng trống kỹ năng để kiểm tra năng lực.
     + Đặt câu hỏi thẩm định tính xác thực của các điểm nêu thêm hoặc chứng chỉ nổi bật.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SCHEMA THEO CẤU TRÚC SAU (KHÔNG KÈM MARKDOWN TEXT KHÁC):
{
  "overall_score": 85.0,
  "breakdown": {
    "skills": {
      "score": 90.0,
      "evidence": [
        {
          "criterion": "Tên kỹ năng",
          "matched": true,
          "score": 90.0,
          "raw_quote": "Câu nguyên văn trích từ CV",
          "explanation": "Lý giải chi tiết mức độ đáp ứng"
        }
      ]
    },
    "experience": {
      "score": 80.0,
      "evidence": [
        {
          "criterion": "Tên tiêu chí kinh nghiệm",
          "matched": true,
          "score": 80.0,
          "raw_quote": "Câu nguyên văn trích từ CV",
          "explanation": "Lý giải chi tiết số năm và chiều sâu thực tế"
        }
      ]
    },
    "education": {
      "score": 85.0,
      "evidence": [
        {
          "criterion": "Tên tiêu chí học vấn",
          "matched": true,
          "score": 85.0,
          "raw_quote": "Câu nguyên văn trích từ CV",
          "explanation": "Lý giải chuyên ngành và bằng cấp"
        }
      ]
    },
    "additional_highlights": [
      {
        "category": "Chứng chỉ chuyên môn / Kỹ năng bổ trợ / Thành tích nổi bật",
        "title": "Tên điểm mạnh hoặc chứng chỉ nêu thêm",
        "raw_quote": "Câu nguyên văn trích từ CV",
        "value_add_analysis": "Phân tích giá trị thặng dư mà điểm mạnh này mang lại cho tổ chức"
      }
    ]
  },
  "ai_summary": "Nhận xét tổng quan sắc bén và công tâm về ứng viên",
  "interview_questions": [
    {
      "question": "Nội dung câu hỏi phỏng vấn?",
      "reason_to_ask": "Lý do gợi ý câu hỏi này?"
    }
  ]
}
"""

class AIEvaluatorService:
    def evaluate_cv(self, masked_cv_text: str, job_title: str, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Gửi yêu cầu tới Gemini API hoặc tạo Mock evaluation nếu chưa có API Key."""
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            logger.warning("Chưa cấu hình GEMINI_API_KEY trong .env. Sử dụng Heuristic Rule-Based Mock Evaluator.")
            return self._heuristic_mock_evaluate(masked_cv_text, job_title, criteria)
            
        try:
            prompt = f"""
            [JOB TITLE]: {job_title}
            [CRITERIA]: {json.dumps(criteria, ensure_ascii=False, indent=2)}
            
            [MASKED CV TEXT]:
            {masked_cv_text}
            """
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]
                    }
                ],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.2
                }
            }
            
            resp = requests.post(url, json=payload, timeout=45)
            if resp.status_code == 200:
                data = resp.json()
                text_response = data['candidates'][0]['content']['parts'][0]['text']
                parsed_json = json.loads(text_response)
                # Đảm bảo trường additional_highlights luôn tồn tại
                if "breakdown" in parsed_json and "additional_highlights" not in parsed_json["breakdown"]:
                    parsed_json["breakdown"]["additional_highlights"] = []
                return parsed_json
            else:
                logger.error(f"Gemini API error: {resp.status_code} - {resp.text}")
                return self._heuristic_mock_evaluate(masked_cv_text, job_title, criteria)
        except Exception as e:
            logger.error(f"Lỗi khi gọi AI Evaluator Service: {str(e)}")
            return self._heuristic_mock_evaluate(masked_cv_text, job_title, criteria)

    def _heuristic_mock_evaluate(self, cv_text: str, job_title: str, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Tạo dữ liệu đánh giá Heuristic thông minh khi không kết nối được LLM."""
        cv_lower = cv_text.lower()
        req_skills = criteria.get("required_skills", [])
        pref_skills = criteria.get("preferred_skills", [])
        min_exp = criteria.get("min_years_experience", 1.0)
        edu_req = criteria.get("education_level", "Bachelor")

        # Chia dòng CV để lấy trích dẫn nguyên văn chính xác
        lines = [line.strip() for line in cv_text.split('\n') if len(line.strip()) > 3]

        def find_best_quote(keyword: str) -> str:
            kw_lower = keyword.lower()
            matching_lines = [l for l in lines if kw_lower in l.lower()]
            if matching_lines:
                # Chọn dòng ngắn gọn xúc tích nhất làm quote
                return min(matching_lines, key=len)
            return ""

        skills_evidence = []
        matched_skills_count = 0
        for skill in req_skills:
            is_matched = skill.lower() in cv_lower
            raw_quote = find_best_quote(skill) if is_matched else ""
            if is_matched:
                matched_skills_count += 1
                if not raw_quote:
                    raw_quote = f"Kỹ năng {skill} được đề cập trong hồ sơ ứng viên."

            skills_evidence.append({
                "criterion": f"Kỹ năng bắt buộc: {skill}",
                "matched": is_matched,
                "score": 100.0 if is_matched else 0.0,
                "raw_quote": raw_quote,
                "explanation": f"Tìm thấy bằng chứng ứng dụng kỹ năng {skill} trong CV" if is_matched else f"Không tìm thấy dữ liệu về kỹ năng '{skill}' trong CV."
            })

        for skill in pref_skills:
            is_matched = skill.lower() in cv_lower
            raw_quote = find_best_quote(skill) if is_matched else ""
            skills_evidence.append({
                "criterion": f"Kỹ năng ưu tiên: {skill}",
                "matched": is_matched,
                "score": 80.0 if is_matched else 0.0,
                "raw_quote": raw_quote,
                "explanation": f"Kỹ năng điểm cộng: {skill} xuất hiện trong hồ sơ." if is_matched else f"Không đề cập kỹ năng ưu tiên {skill}."
            })

        skills_score = round((matched_skills_count / max(len(req_skills), 1)) * 100.0, 1)

        # Trích xuất và phát hiện các kỹ năng / chứng chỉ NÊU THÊM ngoài JD
        common_bonus_keywords = [
            ("Docker", "Kỹ năng bổ trợ", "Containerization & DevOps"),
            ("Kubernetes", "Kỹ năng bổ trợ", "Điều phối hạ tầng Cloud-native"),
            ("AWS", "Chứng chỉ / Năng lực Cloud", "Điện toán đám mây Amazon Web Services"),
            ("Azure", "Chứng chỉ / Năng lực Cloud", "Hạ tầng đám mây Microsoft Azure"),
            ("GCP", "Chứng chỉ / Năng lực Cloud", "Google Cloud Platform"),
            ("Git", "Kỹ năng bổ trợ", "Quản lý mã nguồn & quy trình CI/CD"),
            ("CI/CD", "Kỹ năng bổ trợ", "Tự động hóa triển khai phần mềm"),
            ("Agile", "Quy trình làm việc", "Mô hình phát triển phần mềm linh hoạt"),
            ("Scrum", "Quy trình làm việc", "Quy trình quản lý dự án Scrum"),
            ("PostgreSQL", "Cơ sở dữ liệu", "Hệ quản trị CSDL quan hệ cao cấp"),
            ("MongoDB", "Cơ sở dữ liệu", "CSDL NoSQL quy mô lớn"),
            ("Redis", "Cơ sở dữ liệu", "In-memory Caching & hiệu năng cao"),
            ("TypeScript", "Kỹ năng công nghệ", "Ngôn ngữ lập trình Type-safe"),
            ("Python", "Kỹ năng công nghệ", "Lập trình backend & xử lý dữ liệu"),
            ("React", "Kỹ năng công nghệ", "Phát triển giao diện người dùng SPA"),
            ("Next.js", "Kỹ năng công nghệ", "Fullstack React Framework"),
            ("Node.js", "Kỹ năng công nghệ", "Runtime môi trường backend JavaScript"),
            ("GraphQL", "Kỹ năng công nghệ", "Giao thức truy vấn API tối ưu"),
            ("IELTS", "Chứng chỉ ngoại ngữ", "Năng lực tiếng Anh chuẩn quốc tế"),
            ("TOEIC", "Chứng chỉ ngoại ngữ", "Giao tiếp tiếng Anh môi trường công sở"),
            ("PMP", "Chứng chỉ chuyên môn", "Chứng chỉ Quản lý Dự án Quốc tế"),
            ("Scrum Master", "Chứng chỉ chuyên môn", "Năng lực dẫn dắt đội ngũ Agile"),
        ]

        additional_highlights = []
        # Lọc những từ khóa KHÔNG nằm trong danh sách required hay preferred của JD
        all_jd_skills_lower = [s.lower() for s in req_skills + pref_skills]

        for kw, cat, desc in common_bonus_keywords:
            if kw.lower() not in all_jd_skills_lower and kw.lower() in cv_lower:
                quote = find_best_quote(kw)
                if not quote:
                    quote = f"Ứng viên có năng lực và kinh nghiệm làm việc với {kw}."
                additional_highlights.append({
                    "category": cat,
                    "title": kw,
                    "raw_quote": quote,
                    "value_add_analysis": f"{desc}. Đây là giá trị thặng dư giúp ứng viên thích ứng nhanh và đóng góp nhiều hơn cho đội ngũ so với yêu cầu tiêu chuẩn của JD."
                })

        # Experience matching
        exp_matched = any(w in cv_lower for w in ["year", "năm", "exp", "kinh nghiệm", "kinh nghiem"])
        exp_score = 85.0 if exp_matched else 60.0
        exp_quote = find_best_quote("năm") or find_best_quote("year") or find_best_quote("kinh nghiệm") or "Quá trình làm việc được ghi nhận trong CV."
        exp_evidence = [{
            "criterion": f"Kinh nghiệm tối thiểu: {min_exp} năm",
            "matched": exp_matched,
            "score": exp_score,
            "raw_quote": exp_quote,
            "explanation": f"Ứng viên có quá trình làm việc liên quan đến vị trí {job_title}." if exp_matched else "Cần phỏng vấn thêm để xác nhận số năm thực tế."
        }]

        # Education matching
        edu_matched = any(w in cv_lower for w in ["bachelor", "đại học", "master", "kỹ sư", "cử nhân", "thạc sĩ", "university", "college"])
        edu_score = 90.0 if edu_matched else 70.0
        edu_quote = find_best_quote("đại học") or find_best_quote("university") or find_best_quote("cử nhân") or find_best_quote("bachelor") or "Trình độ học vấn ghi trong hồ sơ."
        edu_evidence = [{
            "criterion": f"Học vấn: {edu_req}",
            "matched": edu_matched,
            "score": edu_score,
            "raw_quote": edu_quote,
            "explanation": "Đạt yêu cầu học vấn và chuyên môn cơ bản." if edu_matched else "Cần đối chiếu thêm bằng cấp trong buổi phỏng vấn."
        }]

        weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "education": 0.2})
        overall_score = round(
            skills_score * weights.get("skills", 0.5) +
            exp_score * weights.get("experience", 0.3) +
            edu_score * weights.get("education", 0.2), 1
        )

        return {
            "overall_score": overall_score,
            "breakdown": {
                "skills": {"score": skills_score, "evidence": skills_evidence},
                "experience": {"score": exp_score, "evidence": exp_evidence},
                "education": {"score": edu_score, "evidence": edu_evidence},
                "additional_highlights": additional_highlights
            },
            "ai_summary": f"Ứng viên đạt mức độ tương thích {overall_score}% so với vị trí {job_title}. Kỹ năng cốt lõi đáp ứng {matched_skills_count}/{len(req_skills)} tiêu chuẩn bắt buộc. Ghi nhận {len(additional_highlights)} điểm mạnh & kỹ năng nêu thêm mang lại giá trị gia tăng.",
            "interview_questions": [
                {
                    "question": f"Bạn hãy mô tả chi tiết dự án thực tế gần nhất mà bạn đã vận dụng thành thạo các kỹ năng cốt lõi ({', '.join(req_skills[:2])})?",
                    "reason_to_ask": "Đánh giá chiều sâu thực tế và khả năng ứng dụng kỹ năng bắt buộc."
                },
                {
                    "question": f"Trong hồ sơ bạn có đề cập đến các năng lực bổ trợ ({', '.join([h['title'] for h in additional_highlights[:2]]) if additional_highlights else 'kỹ năng chuyên ngành'}). Bạn dự định phát huy thế mạnh này như thế nào cho vị trí {job_title}?",
                    "reason_to_ask": "Thẩm định tính thực chất và giá trị thặng dư của các kỹ năng nêu thêm ngoài JD."
                },
                {
                    "question": "Khi đối mặt với sự cố kỹ thuật hoặc áp lực tiến độ nghiêm ngặt trong dự án, phương pháp giải quyết tối ưu của bạn là gì?",
                    "reason_to_ask": "Kiểm tra kỹ năng giải quyết vấn đề và năng lực thích ứng với môi trường doanh nghiệp."
                }
            ]
        }

ai_evaluator_service = AIEvaluatorService()
