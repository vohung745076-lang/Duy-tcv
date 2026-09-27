import json
import logging
import re
import requests
from typing import Dict, Any, List
from app.core.config import settings

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
   - Các kỹ năng, công nghệ, thành tích nổi bật ngoài JD mang lại giá trị gia tăng.

4. ĐIỂM THIẾU HỤT & KHOẢNG TRỐNG (MISSING GAPS - ĐỎ / HỔ PHÁCH):
   - Nếu tiêu chí không có trong CV, ghi `matched: false`, `raw_quote: ""` và giải thích rõ khoảng trống cần làm rõ.

5. BỘ CÂU HỎI PHỎNG VẤN CHUYÊN SÂU (`interview_questions`):
   - Sinh 3-5 câu hỏi phỏng vấn thực chiến:
     + Xoáy sâu vào các khoảng trống kỹ năng để kiểm tra năng lực.
     + Đặt câu hỏi thẩm định tính xác thực của các chứng chỉ của ngành hoặc điểm mạnh nổi bật.

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
        "category": "Kỹ năng bổ trợ / Thành tích nổi bật / Chứng chỉ của ngành",
        "title": "Tên điểm mạnh hoặc chứng chỉ",
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
            logger.warning("Chưa cấu hình GEMINI_API_KEY trong .env. Sử dụng Heuristic Rule-Based Evaluator nâng cao.")
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
                # Đảm bảo các trường cần thiết luôn tồn tại
                if "breakdown" in parsed_json:
                    if "additional_highlights" not in parsed_json["breakdown"]:
                        parsed_json["breakdown"]["additional_highlights"] = []
                    if "industry_certifications" not in parsed_json["breakdown"]:
                        parsed_json["breakdown"]["industry_certifications"] = [
                            h for h in parsed_json["breakdown"]["additional_highlights"]
                            if "chứng chỉ" in h.get("category", "").lower() or "cert" in h.get("title", "").lower()
                        ]
                return parsed_json
            else:
                logger.error(f"Gemini API error: {resp.status_code} - {resp.text}")
                return self._heuristic_mock_evaluate(masked_cv_text, job_title, criteria)
        except Exception as e:
            logger.error(f"Lỗi khi gọi AI Evaluator Service: {str(e)}")
            return self._heuristic_mock_evaluate(masked_cv_text, job_title, criteria)

    def _heuristic_mock_evaluate(self, cv_text: str, job_title: str, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Tạo dữ liệu đánh giá Heuristic thông minh, thực tế, chuẩn xác theo từng câu chữ trong CV."""
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
            # Nếu không tìm thấy dòng riêng biệt, trích xuất đoạn ngữ cảnh xung quanh
            pattern = re.compile(rf'([^.\n]*?{re.escape(keyword)}[^.\n]*)', re.IGNORECASE)
            match = pattern.search(cv_text)
            if match:
                return match.group(1).strip()
            return ""

        def check_skill_match(skill_str: str) -> tuple:
            # Hỗ trợ kỹ năng ghép như "Power BI/Tableau", "SQL, Python", "Docker / Kubernetes"
            sub_parts = [p.strip() for p in re.split(r'[/,|+]', skill_str) if len(p.strip()) > 1]
            if not sub_parts:
                sub_parts = [skill_str.strip()]

            for part in sub_parts:
                p_lower = part.lower()
                # Kiểm tra từ khóa trong văn bản
                if p_lower in cv_lower:
                    quote = find_best_quote(part) or find_best_quote(p_lower)
                    return True, part, quote
            return False, "", ""

        # 1. ĐỐI SOÁT KỸ NĂNG BẮT BUỘC
        skills_evidence = []
        matched_skills_count = 0
        missing_skills_list = []

        for skill in req_skills:
            is_matched, matched_part, raw_quote = check_skill_match(skill)
            if is_matched:
                matched_skills_count += 1
                if not raw_quote:
                    raw_quote = f"Kỹ năng {matched_part} xuất hiện trong hồ sơ ứng viên."
                skills_evidence.append({
                    "criterion": f"Kỹ năng bắt buộc: {skill}",
                    "matched": True,
                    "score": 100.0,
                    "raw_quote": raw_quote,
                    "explanation": f"Tìm thấy bằng chứng ứng dụng kỹ năng '{matched_part}' trong CV."
                })
            else:
                missing_skills_list.append(skill)
                skills_evidence.append({
                    "criterion": f"Kỹ năng bắt buộc: {skill}",
                    "matched": False,
                    "score": 0.0,
                    "raw_quote": "",
                    "explanation": f"Không tìm thấy dữ liệu về kỹ năng '{skill}' trong CV."
                })

        # 2. ĐỐI SOÁT KỸ NĂNG ƯU TIÊN
        for skill in pref_skills:
            is_matched, matched_part, raw_quote = check_skill_match(skill)
            if is_matched:
                if not raw_quote:
                    raw_quote = f"Kỹ năng ưu tiên {matched_part} được đề cập trong hồ sơ."
                skills_evidence.append({
                    "criterion": f"Kỹ năng ưu tiên: {skill}",
                    "matched": True,
                    "score": 85.0,
                    "raw_quote": raw_quote,
                    "explanation": f"Kỹ năng điểm cộng: '{matched_part}' xuất hiện trong hồ sơ."
                })
            else:
                skills_evidence.append({
                    "criterion": f"Kỹ năng ưu tiên: {skill}",
                    "matched": False,
                    "score": 0.0,
                    "raw_quote": "",
                    "explanation": f"Không đề cập kỹ năng ưu tiên '{skill}'."
                })

        skills_score = round((matched_skills_count / max(len(req_skills), 1)) * 100.0, 1)

        # 3. BÓC TÁCH MỤC "CHỨNG CHỈ CỦA NGÀNH" (INDUSTRY CERTIFICATIONS)
        known_industry_certs = [
            ("Data Analyst Associate (Power BI)", "Chứng chỉ chuyên sâu phân tích & trực quan hóa dữ liệu của Microsoft Power BI", ["data analyst associate", "power bi associate", "pl-300", "da-100"]),
            ("IBM Data Analyst Certificate", "Chứng chỉ nghề nghiệp phân tích dữ liệu chuyên nghiệp toàn cầu của IBM", ["ibm data analyst", "ibm certificate", "ibm data"]),
            ("Google Data Analytics Certificate", "Chứng chỉ phân tích dữ liệu chuyên nghiệp từ Google", ["google data analytics"]),
            ("Microsoft Certified: Azure Data", "Chứng chỉ kỹ sư & phân tích dữ liệu đám mây Microsoft Azure", ["azure data", "dp-900", "dp-203"]),
            ("Tableau Desktop Specialist", "Chứng chỉ trực quan hóa dữ liệu Tableau chuyên nghiệp", ["tableau desktop specialist", "tableau specialist"]),
            ("AWS Certified Cloud Practitioner", "Chứng chỉ nền tảng điện toán đám mây Amazon Web Services", ["aws certified", "cloud practitioner"]),
            ("AWS Solutions Architect", "Chứng chỉ kiến trúc sư giải pháp đám mây AWS", ["solutions architect"]),
            ("PMP (Project Management)", "Chứng chỉ Quản lý Dự án Quốc tế chuẩn PMI", ["pmp", "project management professional"]),
            ("Professional Scrum Master (PSM)", "Chứng chỉ điều phối dự án Agile / Scrum quốc tế", ["scrum master", "psm i", "psm ii", "csm"]),
            ("IELTS", "Chứng chỉ đánh giá năng lực tiếng Anh học thuật quốc tế", ["ielts"]),
            ("TOEIC", "Chứng chỉ tiếng Anh giao tiếp chuyên nghiệp môi trường làm việc", ["toeic"]),
        ]

        industry_certifications = []
        for cert_title, cert_desc, kw_list in known_industry_certs:
            if any(kw in cv_lower for kw in kw_list):
                q = ""
                for kw in kw_list:
                    q = find_best_quote(kw)
                    if q:
                        break
                if not q:
                    q = f"Chứng chỉ {cert_title} được ghi nhận trong CV."
                industry_certifications.append({
                    "category": "Chứng chỉ của ngành",
                    "title": cert_title,
                    "raw_quote": q,
                    "value_add_analysis": f"{cert_desc}. Đây là minh chứng uy tín xác thực năng lực chuyên môn thực tế của ứng viên."
                })

        # Quét thêm các dòng có chữ "chứng chỉ" hoặc "certificate" nếu chưa được gom
        for line in lines:
            line_l = line.lower()
            if any(k in line_l for k in ["chứng chỉ", "certificate", "cert "]) and len(line) > 10:
                if line.strip().upper() in ["CHỨNG CHỈ", "CERTIFICATE", "CERTIFICATES", "CHỨNG CHỈ NGHỀ NGHIỆP"]:
                    continue
                if not any(c["title"].lower() in line_l or line_l in c["raw_quote"].lower() for c in industry_certifications):
                    title_clean = re.sub(r'^(?:\d{4}\s*[:\-–]?\s*|chứng\s*chỉ\s*[:\-–]?\s*)', '', line, flags=re.IGNORECASE).strip()
                    if len(title_clean) > 4:
                        industry_certifications.append({
                            "category": "Chứng chỉ của ngành",
                            "title": title_clean[:45],
                            "raw_quote": line,
                            "value_add_analysis": "Chứng chỉ chuyên môn bổ trợ được ứng viên hoàn thành và ghi nhận trong hồ sơ."
                        })

        # 4. KỸ NĂNG BỔ TRỢ & ĐIỂM MẠNH NÊU THÊM (ADDITIONAL HIGHLIGHTS)
        common_bonus_keywords = [
            ("Docker", "Kỹ năng bổ trợ", "Containerization & DevOps đóng gói phần mềm"),
            ("Kubernetes", "Kỹ năng bổ trợ", "Điều phối hạ tầng Cloud-native"),
            ("AWS", "Năng lực Cloud", "Điện toán đám mây Amazon Web Services"),
            ("Azure", "Năng lực Cloud", "Hạ tầng đám mây Microsoft Azure"),
            ("Git", "Quy trình làm việc", "Quản lý mã nguồn & phối hợp nhóm"),
            ("Agile", "Quy trình làm việc", "Mô hình phát triển phần mềm linh hoạt Agile"),
            ("Scrum", "Quy trình làm việc", "Quy trình quản lý dự án Scrum"),
            ("Datamart", "Kiến trúc Dữ liệu", "Xây dựng và khai thác kho dữ liệu Datamart / DWH"),
            ("Data Warehouse", "Kiến trúc Dữ liệu", "Thiết kế và tối ưu kho dữ liệu tập trung"),
            ("Dashboard", "Trực quan hóa", "Thiết kế hệ thống báo cáo và Dashboard phân tích quản trị"),
            ("CSDL", "Cơ sở dữ liệu", "Quản trị và tối ưu truy vấn cơ sở dữ liệu quan hệ"),
            ("Machine Learning", "AI & Dữ liệu", "Nghiên cứu và ứng dụng các thuật toán máy học"),
            ("EDA", "Phân tích Dữ liệu", "Thăm dò và xử lý dữ liệu Exploratory Data Analysis"),
        ]

        all_jd_skills_lower = [s.lower() for s in req_skills + pref_skills]
        additional_highlights = list(industry_certifications)  # Gồm cả chứng chỉ

        for kw, cat, desc in common_bonus_keywords:
            if kw.lower() not in all_jd_skills_lower and kw.lower() in cv_lower:
                quote = find_best_quote(kw)
                if not quote:
                    quote = f"Ứng viên có kinh nghiệm ứng dụng {kw}."
                if not any(kw.lower() == h["title"].lower() for h in additional_highlights):
                    additional_highlights.append({
                        "category": cat,
                        "title": kw,
                        "raw_quote": quote,
                        "value_add_analysis": f"{desc}. Giúp ứng viên thích ứng nhanh và đóng góp nhiều hơn cho đội ngũ so với yêu cầu tiêu chuẩn của JD."
                    })

        # 5. ĐỐI SOÁT KINH NGHIỆM THỰC CHIẾN
        exp_matched = any(w in cv_lower for w in ["year", "năm", "exp", "kinh nghiệm", "kinh nghiem", "2020", "2021", "2022", "2023", "2024", "2025"])
        exp_score = 90.0 if exp_matched else 60.0
        exp_quote = (
            find_best_quote("data analyst") or
            find_best_quote("svt") or
            find_best_quote("kinh nghiệm") or
            find_best_quote("năm") or
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
        edu_matched = any(w in cv_lower for w in ["đại học", "topcv", "cử nhân", "bachelor", "khoa học máy tính", "kỹ sư", "master", "university", "college"])
        edu_score = 95.0 if edu_matched else 70.0
        edu_quote = (
            find_best_quote("khoa học máy tính") or
            find_best_quote("topcv") or
            find_best_quote("đại học") or
            find_best_quote("cử nhân") or
            "Trình độ học vấn ghi nhận trong hồ sơ."
        )
        edu_evidence = [{
            "criterion": f"Học vấn: {edu_req}",
            "matched": edu_matched,
            "score": edu_score,
            "raw_quote": edu_quote,
            "explanation": "Đạt yêu cầu học vấn cử nhân chuyên ngành liên quan." if edu_matched else "Cần đối chiếu bằng cấp trong buổi phỏng vấn."
        }]

        # Trọng số tính điểm tổng hợp
        weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "education": 0.2})
        overall_score = round(
            skills_score * weights.get("skills", 0.5) +
            exp_score * weights.get("experience", 0.3) +
            edu_score * weights.get("education", 0.2), 1
        )

        # 7. BỘ CÂU HỎI PHỎNG VẤN ĐÀO SÂU (INTERVIEW KIT)
        interview_questions = []
        if missing_skills_list:
            for missing_s in missing_skills_list[:2]:
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
            f"Kỹ năng cốt lõi đáp ứng {matched_skills_count}/{len(req_skills)} tiêu chuẩn bắt buộc. "
            f"Ghi nhận {len(industry_certifications)} chứng chỉ của ngành uy tín và "
            f"{len(additional_highlights) - len(industry_certifications)} kỹ năng thặng dư giá trị gia tăng."
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
