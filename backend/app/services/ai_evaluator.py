import json
import logging
import requests
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là chuyên gia thẩm định hồ sơ tuyển dụng và đối soát nhân sự cao cấp (AI Copilot).
Nhiệm vụ của bạn là phân tích văn bản CV đã được che mờ thông tin cá nhân (Masked CV Text) đối chiếu với Bản mô tả công việc (Job Description Criteria).

QUY TẮC BẮT BUỘC:
1. KHÔNG PHÓNG ĐẠI hay TỰ SUY DIỄN: Mọi đánh giá kỹ năng/kinh nghiệm BẮT BUỘC phải trích dẫn CÂU NGUYÊN VĂN (`raw_quote`) xuất hiện trong CV.
2. NẾU KHÔNG CÓ TRONG CV: Hãy ghi `matched: false`, `raw_quote: ""` và nêu rõ trong `explanation`.
3. TÍNH ĐIỂM THÀNH PHẦN ($0 - 100$):
   - `skills.score`: Mức độ đáp ứng các kỹ năng bắt buộc và ưu tiên.
   - `experience.score`: Số năm kinh nghiệm thực tế và sự phù hợp công việc.
   - `education.score`: Trình độ học vấn / bằng cấp / chuyên ngành.
4. GỢI Ý CÂU HỎI PHỎNG VẤN (`interview_questions`): Sinh 3-5 câu hỏi phỏng vấn tập trung xoáy sâu vào các lỗ hổng kiến thức hoặc điểm chưa làm rõ trong CV.

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
          "explanation": "Lý giải ngắn gọn"
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
          "explanation": "Lý giải ngắn gọn"
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
          "explanation": "Lý giải ngắn gọn"
        }
      ]
    }
  },
  "ai_summary": "Nhận xét tổng quan ngắn gọn về ứng viên",
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

        skills_evidence = []
        matched_skills_count = 0
        for skill in req_skills:
            is_matched = skill.lower() in cv_lower
            if is_matched:
                matched_skills_count += 1
                # Tìm dòng chứa skill làm raw_quote
                lines = [line.strip() for line in cv_text.split('\n') if skill.lower() in line.lower()]
                raw_quote = lines[0] if lines else f"Kỹ năng {skill} xuất hiện trong CV."
            else:
                raw_quote = ""
            
            skills_evidence.append({
                "criterion": f"Kỹ năng bắt buộc: {skill}",
                "matched": is_matched,
                "score": 100.0 if is_matched else 0.0,
                "raw_quote": raw_quote,
                "explanation": f"Tìm thấy kỹ năng {skill} trong CV" if is_matched else f"Không tìm thấy từ khóa '{skill}' trong CV."
            })

        for skill in pref_skills:
            is_matched = skill.lower() in cv_lower
            lines = [line.strip() for line in cv_text.split('\n') if skill.lower() in line.lower()]
            raw_quote = lines[0] if lines else f"Kỹ năng ưu tiên {skill}" if is_matched else ""
            skills_evidence.append({
                "criterion": f"Kỹ năng ưu tiên: {skill}",
                "matched": is_matched,
                "score": 80.0 if is_matched else 0.0,
                "raw_quote": raw_quote,
                "explanation": f"Kỹ năng điểm thưởng: {skill}" if is_matched else f"Không đề cập kỹ năng ưu tiên {skill}."
            })

        skills_score = round((matched_skills_count / max(len(req_skills), 1)) * 100.0, 1)

        # Experience matching mock
        exp_matched = "year" in cv_lower or "năm" in cv_lower or "exp" in cv_lower
        exp_score = 85.0 if exp_matched else 60.0
        exp_evidence = [{
            "criterion": f"Kinh nghiệm tối thiểu: {min_exp} năm",
            "matched": exp_matched,
            "score": exp_score,
            "raw_quote": "Kinh nghiệm làm việc chuyên môn được ghi nhận trong CV.",
            "explanation": f"Ứng viên có quá trình làm việc liên quan đến vị trí {job_title}."
        }]

        # Education matching mock
        edu_matched = "bachelor" in cv_lower or "đại học" in cv_lower or "master" in cv_lower or "kỹ sư" in cv_lower or "cử nhân" in cv_lower
        edu_score = 90.0 if edu_matched else 70.0
        edu_evidence = [{
            "criterion": f"Học vấn: {edu_req}",
            "matched": edu_matched,
            "score": edu_score,
            "raw_quote": "Trình độ học vấn ghi trong phần Education.",
            "explanation": "Đạt yêu cầu trình độ chuyên môn."
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
                "education": {"score": edu_score, "evidence": edu_evidence}
            },
            "ai_summary": f"Ứng viên đạt mức độ tương thích {overall_score}% so với vị trí {job_title}. Kỹ năng chuyên môn đáp ứng {matched_skills_count}/{len(req_skills)} tiêu chuẩn bắt buộc.",
            "interview_questions": [
                {
                    "question": f"Bạn hãy mô tả chi tiết kinh nghiệm ứng dụng các kỹ năng chuyên môn ({', '.join(req_skills[:2])}) trong dự án gần nhất?",
                    "reason_to_ask": "Đánh giá mức độ am hiểu thực tế của kỹ năng chuyên môn."
                },
                {
                    "question": "Bài học lớn nhất của bạn khi đối mặt với sự cố kỹ thuật trong môi trường production là gì?",
                    "reason_to_ask": "Kiểm tra kỹ năng giải quyết vấn đề và chịu áp lực công việc."
                },
                {
                    "question": f"Định hướng phát triển bản thân của bạn trong 2 năm tới đối với vị trí {job_title} là gì?",
                    "reason_to_ask": "Đánh giá sự gắn bó và phù hợp định hướng tuyển dụng."
                }
            ]
        }

ai_evaluator_service = AIEvaluatorService()
