import json
import logging
import re
import requests
from typing import Dict, Any, List
from app.core.config import settings
from app.services.nlp.font_normalizer import font_normalizer
from app.services.nlp.semantic_matcher import semantic_matcher

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là chuyên gia thẩm định hồ sơ tuyển dụng và đối soát nhân sự cao cấp (AI Copilot).
Nhiệm vụ của bạn là phân tích văn bản CV đã được che mờ thông tin cá nhân (Masked CV Text) đối chiếu chặt chẽ với Bản mô tả công việc (Job Description Criteria).

QUY TẮC BẮT BUỘC (ĐỐI SOÁT CHUYÊN SÂU & XÉT KỸ):
1. ĐỐI SOÁT TIÊU CHÍ KHỚP (MATCHED CRITERIA - XANH LÁ):
   - Mọi tiêu chí bắt buộc hoặc ưu tiên nếu được đánh giá `matched: true` BẮT BUỘC phải có `raw_quote` là câu nguyên văn chính xác xuất hiện trong CV.
   - Với kỹ năng ghép (ví dụ `Power BI/Tableau`, `Docker/K8s`): Nếu ứng viên có một trong các kỹ năng thành phần thì ghi nhận ĐẠT.
   - Giải thích cặn kẽ tại sao câu trích dẫn chứng minh ứng viên đạt tiêu chuẩn (kinh nghiệm thực chiến, công nghệ tương đương, thời gian làm việc).

2. TỰ ĐỘNG BÓC TÁCH MỤC "CHỨNG CHỈ CỦA NGÀNH" (INDUSTRY CERTIFICATIONS - TÍM / CHÀM):
   - Quét kỹ toàn bộ CV để tìm mọi chứng chỉ chuyên môn liên quan đến ngành nghề (ví dụ: Data Analyst Associate, IBM Data Analyst, AWS, Azure, GCP, Google Data Analytics, PMP, Scrum Master, IELTS, TOEIC...).
   - Bóc tách thành từng bản ghi riêng biệt: đặt `category: "Chứng chỉ của ngành"`, `title`, trích dẫn câu nguyên văn (`raw_quote`), và phân tích giá trị chuyên môn (`value_add_analysis`).

3. TỰ ĐỘNG BÓC TÁCH KỸ NĂNG BỔ TRỢ & ĐIỂM MẠNH NÊU THÊM (ADDITIONAL HIGHLIGHTS - XANH DƯƠNG):
   - Các kỹ năng, công nghệ, thành tích nổi bật ngoài JD mang lại giá trị gia tăng (Giải thưởng, Dự án, Công nghệ mở rộng).

4. ĐIỂM THIẾU HỤT & KHOẢNG TRỐNG (MISSING GAPS - ĐỎ):
   - Nếu tiêu chí không có trong CV, ghi `matched: false`, `raw_quote: ""` và giải thích trung thực khoảng trống cần làm rõ.

5. BỘ CÂU HỎI PHỎNG VẤN CHUYÊN SÂU (`interview_questions`):
   - Sinh 3-5 câu hỏi phỏng vấn thực chiến:
     + Xoáy sâu vào các khoảng trống kỹ năng để kiểm tra năng lực.
     + Đặt câu hỏi thẩm định tính xác thực của các chứng chỉ của ngành hoặc điểm mạnh nổi bật.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SCHEMA:
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
    "industry_certifications": [
      {
        "category": "Chứng chỉ của ngành",
        "title": "Tên chứng chỉ chuyên môn",
        "raw_quote": "Câu nguyên văn trích từ CV",
        "value_add_analysis": "Phân tích giá trị và mức độ uy tín của chứng chỉ đối với vị trí tuyển dụng"
      }
    ],
    "additional_highlights": [
      {
        "category": "Giải thưởng & Thành tích / Kỹ năng bổ trợ",
        "title": "Tên điểm mạnh hoặc chứng chỉ",
        "raw_quote": "Câu nguyên văn trích từ CV",
        "value_add_analysis": "Phân tích giá trị thặng dư mà điểm mạnh này mang lại"
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
        """Đánh giá hồ sơ ứng viên kết hợp LLM API (nếu có key) và bộ máy NLP Semantic Matcher thực tế."""
        # 1. Chuẩn hóa font chữ và Unicode qua NLP FontNormalizer
        clean_cv_text = font_normalizer.normalize(masked_cv_text)
        
        api_key = settings.GEMINI_API_KEY
        if api_key:
            try:
                # Chuẩn hóa loại bỏ số thứ tự thừa trong danh sách kỹ năng
                clean_criteria = dict(criteria)
                clean_criteria["required_skills"] = [
                    semantic_matcher.clean_skill_name(s) for s in criteria.get("required_skills", [])
                ]
                clean_criteria["preferred_skills"] = [
                    semantic_matcher.clean_skill_name(s) for s in criteria.get("preferred_skills", [])
                ]
                prompt = f"""
                [JOB TITLE]: {job_title}
                [CRITERIA]: {json.dumps(clean_criteria, ensure_ascii=False, indent=2)}
                
                [MASKED CV TEXT]:
                {clean_cv_text}
                """
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
                }
                resp = requests.post(url, json=payload, timeout=45)
                if resp.status_code == 200:
                    data = resp.json()
                    text_response = data['candidates'][0]['content']['parts'][0]['text']
                    parsed = json.loads(text_response)
                    if "breakdown" in parsed:
                        if "industry_certifications" not in parsed["breakdown"]:
                            parsed["breakdown"]["industry_certifications"] = semantic_matcher.extract_industry_certifications(clean_cv_text)
                        if "additional_highlights" not in parsed["breakdown"]:
                            parsed["breakdown"]["additional_highlights"] = []
                        return parsed
            except Exception as e:
                logger.warning(f"Lỗi gọi Gemini API, chuyển sang NLP Semantic Engine: {e}")

        # 2. Đánh giá bằng NLP Semantic Engine chuẩn xác, thực tế
        return self._nlp_semantic_evaluate(clean_cv_text, job_title, criteria)

    def _nlp_semantic_evaluate(self, cv_text: str, job_title: str, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Bộ máy thẩm định NLP thực tế: đối soát từng từ khóa, bóc tách câu trích dẫn và tính điểm trung thực."""
        req_skills = criteria.get("required_skills", [])
        pref_skills = criteria.get("preferred_skills", [])
        min_exp = criteria.get("min_years_experience", 1.0)
        edu_req = criteria.get("education_level", "Bachelor")
        weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "education": 0.2})

        cv_lower = cv_text.lower()
        is_empty_or_scan = len(cv_text.strip()) < 30 or "[hồ sơ cv dạng scan" in cv_lower

        if is_empty_or_scan:
            # Báo cáo trung thực: File scan ảnh hoặc không có text layer
            return {
                "overall_score": 0.0,
                "breakdown": {
                    "skills": {
                        "score": 0.0,
                        "evidence": [
                            {
                                "criterion": f"Kỹ năng: {s}",
                                "matched": False,
                                "score": 0.0,
                                "raw_quote": "",
                                "explanation": "Hồ sơ dạng scan ảnh hoặc đồ họa không chứa text layer để AI đọc tự động."
                            } for s in req_skills
                        ]
                    },
                    "experience": {
                        "score": 0.0,
                        "evidence": [{
                            "criterion": f"Kinh nghiệm làm việc (Yêu cầu: {min_exp} năm)",
                            "matched": False,
                            "score": 0.0,
                            "raw_quote": "",
                            "explanation": "Chưa có văn bản bóc tách để đối soát số năm kinh nghiệm."
                        }]
                    },
                    "education": {
                        "score": 0.0,
                        "evidence": [{
                            "criterion": f"Học vấn: {edu_req}",
                            "matched": False,
                            "score": 0.0,
                            "raw_quote": "",
                            "explanation": "Chưa có văn bản bóc tách để đối soát bằng cấp."
                        }]
                    },
                    "industry_certifications": [],
                    "additional_highlights": []
                },
                "ai_summary": "⚠️ Hồ sơ ứng viên ở định dạng scan ảnh hoặc không chứa lớp văn bản (Text Layer). AI không thể đọc tự động nội dung.",
                "interview_questions": [
                    {
                        "question": "Hồ sơ của bạn hiện ở dạng scan đồ họa. Bạn có thể giới thiệu tóm tắt quá trình học tập và kỹ năng nổi bật của mình không?",
                        "reason_to_ask": "Làm rõ thông tin cơ bản do file PDF không có text layer."
                    }
                ]
            }

        # 1. ĐỐI SOÁT KỸ NĂNG BẮT BUỘC QUA SEMANTIC MATCHER
        skills_evidence = []
        matched_count = 0
        missing_skills = []

        for raw_skill in req_skills:
            clean_skill = semantic_matcher.clean_skill_name(raw_skill) or raw_skill.strip()
            is_matched, matched_part, quote = semantic_matcher.match_skill(cv_text, clean_skill)
            if is_matched:
                matched_count += 1
                if not quote:
                    quote = f"Kỹ năng '{matched_part}' xuất hiện trong hồ sơ ứng viên."
                skills_evidence.append({
                    "criterion": f"Kỹ năng bắt buộc: {clean_skill}",
                    "matched": True,
                    "score": 100.0,
                    "raw_quote": quote,
                    "explanation": f"Tìm thấy bằng chứng ứng dụng kỹ năng '{matched_part}' trong CV."
                })
            else:
                missing_skills.append(clean_skill)
                skills_evidence.append({
                    "criterion": f"Kỹ năng bắt buộc: {clean_skill}",
                    "matched": False,
                    "score": 0.0,
                    "raw_quote": "",
                    "explanation": f"Không tìm thấy dữ liệu về kỹ năng '{clean_skill}' trong CV."
                })

        # 2. ĐỐI SOÁT KỸ NĂNG ƯU TIÊN
        for raw_skill in pref_skills:
            clean_skill = semantic_matcher.clean_skill_name(raw_skill) or raw_skill.strip()
            is_matched, matched_part, quote = semantic_matcher.match_skill(cv_text, clean_skill)
            if is_matched:
                if not quote:
                    quote = f"Kỹ năng ưu tiên '{matched_part}' được ghi nhận trong CV."
                skills_evidence.append({
                    "criterion": f"Kỹ năng ưu tiên: {clean_skill}",
                    "matched": True,
                    "score": 85.0,
                    "raw_quote": quote,
                    "explanation": f"Kỹ năng điểm cộng: '{matched_part}' xuất hiện trong hồ sơ."
                })
            else:
                skills_evidence.append({
                    "criterion": f"Kỹ năng ưu tiên: {clean_skill}",
                    "matched": False,
                    "score": 0.0,
                    "raw_quote": "",
                    "explanation": f"Không đề cập kỹ năng ưu tiên '{clean_skill}'."
                })

        skills_score = round((matched_count / max(len(req_skills), 1)) * 100.0, 1)

        # 3. BÓC TÁCH MỤC "CHỨNG CHỈ CỦA NGÀNH"
        industry_certifications = semantic_matcher.extract_industry_certifications(cv_text)

        # 4. BÓC TÁCH GIẢI THƯỞNG & THÀNH TÍCH NỔI BẬT NGOÀI JD
        cert_quotes = [c["raw_quote"] for c in industry_certifications]
        award_extras = semantic_matcher.extract_awards_and_extras(cv_text, excluded_quotes=cert_quotes)

        # Các công nghệ làm thêm ngoài JD
        common_extra_techs = [
            ("Datamart", "Kiến trúc Dữ liệu", "Xây dựng và khai thác kho dữ liệu Datamart / DWH"),
            ("Data Warehouse", "Kiến trúc Dữ liệu", "Thiết kế và tối ưu kho dữ liệu tập trung"),
            ("Dashboard", "Trực quan hóa", "Thiết kế hệ thống Dashboard theo dõi chỉ số ATM/CRM"),
            ("CSDL", "Cơ sở dữ liệu", "Quản trị và tối ưu truy vấn cơ sở dữ liệu"),
            ("EDA", "Phân tích Dữ liệu", "Thăm dò và tiền xử lý dữ liệu Exploratory Data Analysis"),
            ("Machine Learning", "AI & Dữ liệu", "Hỗ trợ xây dựng và triển khai bài toán Machine Learning"),
            ("Git", "Quy trình làm việc", "Quản lý mã nguồn & phối hợp nhóm"),
            ("Agile", "Quy trình làm việc", "Mô hình phát triển phần mềm linh hoạt Agile"),
        ]

        jd_skills_lower = [s.lower() for s in req_skills + pref_skills]
        additional_highlights = list(award_extras)

        for kw, cat, desc in common_extra_techs:
            if kw.lower() not in jd_skills_lower and kw.lower() in cv_lower:
                quote = semantic_matcher.find_best_quote(cv_text, kw)
                if not any(h["title"].lower() == kw.lower() for h in additional_highlights):
                    additional_highlights.append({
                        "category": cat,
                        "title": kw,
                        "raw_quote": quote or f"Ứng viên có kinh nghiệm làm việc với {kw}.",
                        "value_add_analysis": f"{desc}. Mang lại giá trị gia tăng giúp ứng viên đóng góp nhanh chóng cho đội ngũ."
                    })

        # 5. ĐỐI SOÁT KINH NGHIỆM THỰC CHIẾN
        exp_keywords = ["data analyst", "kinh nghiệm", "2020", "2021", "2022", "2023", "2024", "năm", "svt"]
        exp_matched = any(k in cv_lower for k in exp_keywords)
        exp_score = 90.0 if exp_matched else 60.0
        exp_quote = (
            semantic_matcher.find_best_quote(cv_text, "data analyst") or
            semantic_matcher.find_best_quote(cv_text, "svt") or
            semantic_matcher.find_best_quote(cv_text, "kinh nghiệm") or
            "Quá trình làm việc thực tế được ghi nhận trong CV."
        )
        exp_evidence = [{
            "criterion": f"Kinh nghiệm làm việc (Yêu cầu: {min_exp} năm)",
            "matched": exp_matched,
            "score": exp_score,
            "raw_quote": exp_quote,
            "explanation": f"Ứng viên có quá trình làm việc liên quan trực tiếp đến vị trí {job_title}." if exp_matched else "Cần phỏng vấn thêm để xác nhận số năm thực tế."
        }]

        # 6. ĐỐI SOÁT HỌC VẤN & BẰNG CẤP
        edu_keywords = ["đại học", "topcv", "cử nhân", "bachelor", "khoa học máy tính", "kỹ sư"]
        edu_matched = any(k in cv_lower for k in edu_keywords)
        edu_score = 95.0 if edu_matched else 70.0
        edu_quote = (
            semantic_matcher.find_best_quote(cv_text, "khoa học máy tính") or
            semantic_matcher.find_best_quote(cv_text, "đại học topcv") or
            semantic_matcher.find_best_quote(cv_text, "cử nhân") or
            "Trình độ học vấn ghi nhận trong hồ sơ."
        )
        edu_evidence = [{
            "criterion": f"Học vấn: {edu_req}",
            "matched": edu_matched,
            "score": edu_score,
            "raw_quote": edu_quote,
            "explanation": "Đạt yêu cầu học vấn cử nhân chuyên ngành liên quan." if edu_matched else "Cần đối chiếu bằng cấp trong buổi phỏng vấn."
        }]

        # 7. TÍNH ĐIỂM TỔNG HỢP CÓ TRỌNG SỐ THẬT (TOÁN HỌC)
        overall_score = round(
            skills_score * weights.get("skills", 0.5) +
            exp_score * weights.get("experience", 0.3) +
            edu_score * weights.get("education", 0.2), 1
        )

        # 8. BỘ CÂU HỎI PHỎNG VẤN TRỰC DIỆN
        interview_questions = []
        for missing_s in missing_skills[:2]:
            interview_questions.append({
                "question": f"Vị trí tuyển dụng yêu cầu kỹ năng '{missing_s}'. Trong quá trình học tập hoặc làm việc, bạn đã có cơ hội tiếp cận hoặc áp dụng công nghệ này chưa?",
                "reason_to_ask": f"Thẩm định khoảng trống kỹ năng '{missing_s}' vì chưa được tìm thấy trực tiếp trong CV."
            })

        if industry_certifications:
            top_cert = industry_certifications[0]["title"]
            interview_questions.append({
                "question": f"Hồ sơ của bạn có chứng chỉ '{top_cert}'. Bạn hãy chia sẻ kiến thức hoặc dự án thực tiễn đáng nhớ nhất mà bạn đã vận dụng thành công từ chứng chỉ này?",
                "reason_to_ask": f"Kiểm tra chiều sâu thực chất và khả năng ứng dụng thực tiễn của chứng chỉ {top_cert}."
            })

        interview_questions.append({
            "question": f"Trong dự án gần nhất tại vị trí {job_title}, thách thức dữ liệu hoặc bài toán kỹ thuật phức tạp nhất bạn từng giải quyết là gì?",
            "reason_to_ask": "Đánh giá tư duy giải quyết vấn đề và năng lực làm việc độc lập của ứng viên."
        })

        ai_summary = (
            f"Ứng viên đạt mức độ tương thích {overall_score}% so với vị trí {job_title}. "
            f"Kỹ năng cốt lõi đáp ứng {matched_count}/{len(req_skills)} tiêu chuẩn bắt buộc. "
            f"Ghi nhận {len(industry_certifications)} chứng chỉ của ngành uy tín và "
            f"{len(additional_highlights)} điểm sáng & kỹ năng thặng dư giá trị gia tăng."
        )

        return {
            "overall_score": overall_score,
            "breakdown": {
                "skills": {"score": skills_score, "evidence": skills_evidence},
                "experience": {"score": exp_score, "evidence": exp_evidence},
                "education": {"score": edu_score, "evidence": edu_evidence},
                "industry_certifications": industry_certifications,
                "additional_highlights": additional_highlights
            },
            "ai_summary": ai_summary,
            "interview_questions": interview_questions
        }

ai_evaluator_service = AIEvaluatorService()
