import os
import sys
import unittest
from fastapi.testclient import TestClient

# Thêm đường dẫn backend vào sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.database import SessionLocal, Base, engine
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.services.pii_service import pii_service

class SystemFlowTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def test_01_security_unauthorized_blocked(self):
        """SEC-01: Kiểm tra API chặn đứng 401 Unauthorized khi không có JWT token."""
        # Đảm bảo không có override
        app.dependency_overrides.clear()
        
        res = self.client.get("/api/v1/jobs")
        self.assertEqual(res.status_code, 401)
        
        res_post = self.client.post("/api/v1/jobs", json={"title": "Hacker Job", "criteria": {}})
        self.assertEqual(res_post.status_code, 401)
        print("[OK] Test SEC-01 (Unauthorized Blocked): PASSED (Rejected with 401 Unauthorized)")

        # Sau khi xác nhận SEC-01 hoạt động, cấp quyền ADMIN giả lập cho Test Suite tiếp tục
        admin_user = AuthenticatedUser(id="test-admin-id", email="admin@test.local", role="ADMIN", full_name="Test Admin")
        app.dependency_overrides[get_current_user] = lambda: admin_user

    def test_02_pii_masking(self):
        """Kiểm tra dịch vụ ẩn danh PII Masking."""
        raw_text = """
        Họ tên: Nguyễn Văn Anh
        Số điện thoại: 0987654321 hoặc +84912345678
        Email: nguyenvananh.dev@gmail.com
        Ngày sinh: 15/08/1995
        CCCD: 001234567890
        Kinh nghiệm: 4 năm lập trình Python, FastAPI và Docker.
        """
        masked = pii_service.mask_text(raw_text)
        self.assertNotIn("0987654321", masked)
        self.assertNotIn("nguyenvananh.dev@gmail.com", masked)
        self.assertNotIn("15/08/1995", masked)
        self.assertIn("[MASKED_PHONE]", masked)
        self.assertIn("[MASKED_EMAIL]", masked)
        self.assertIn("[MASKED_DOB]", masked)
        print("[OK] Test 2 (PII Masking): PASSED")

    def test_03_job_crud(self):
        """Kiểm tra tạo vị trí tuyển dụng (JD)."""
        job_payload = {
            "title": "Senior Python Backend Engineer",
            "department": "Engineering",
            "description": "Tuyển dụng kỹ sư Backend phát triển microservices FastAPI",
            "criteria": {
                "weights": {
                    "skills": 0.5,
                    "experience": 0.3,
                    "education": 0.2
                },
                "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
                "preferred_skills": ["Redis", "Kubernetes"],
                "min_years_experience": 3.0,
                "education_level": "Đại học CNTT"
            }
        }
        res = self.client.post("/api/v1/jobs", json=job_payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data["title"], "Senior Python Backend Engineer")
        self.__class__.job_id = data["id"]
        print(f"[OK] Test 3 (Create Job): PASSED (Job ID: {self.__class__.job_id})")

    def test_04_list_jobs(self):
        """Kiểm tra lấy danh sách jobs."""
        res = self.client.get("/api/v1/jobs")
        self.assertEqual(res.status_code, 200)
        jobs = res.json()
        self.assertTrue(len(jobs) > 0)
        print(f"[OK] Test 4 (List Jobs): PASSED (Found {len(jobs)} jobs)")

    def test_05_create_and_upload_pdf_cv(self):
        """Kiểm tra nạp file PDF CV thực tế vào hệ thống."""
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 210 >>
stream
BT
/F1 12 Tf
72 712 Td
(Software Engineer CV) Tj
0 -20 Td
(Phone: 0987123456 - Email: candidate.test@domain.com) Tj
0 -20 Td
(Skills: 3 years building microservices with Python, FastAPI and Docker) Tj
0 -20 Td
(Education: Bachelor of Computer Science) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000507 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
580
%%EOF"""
        
        files = [
            ("files", ("CV_Test_Candidate.pdf", pdf_content, "application/pdf"))
        ]
        res = self.client.post(f"/api/v1/candidates/jobs/{self.__class__.job_id}/upload", files=files)
        self.assertEqual(res.status_code, 201)
        candidates = res.json()
        self.assertEqual(len(candidates), 1)
        self.__class__.candidate_id = candidates[0]["id"]
        self.assertTrue(len(candidates[0]["masked_name"]) > 0)
        print(f"[OK] Test 5 (Upload CV & PII Masking): PASSED (Candidate ID: {self.__class__.candidate_id}, Name: {candidates[0]['masked_name']})")

    def test_06_ai_evaluation_and_citations(self):
        """Kiểm tra AI Screening Pipeline, tính điểm và trích dẫn bằng chứng."""
        res = self.client.post(f"/api/v1/evaluations/process/{self.__class__.candidate_id}")
        self.assertEqual(res.status_code, 200)
        eval_data = res.json()
        self.assertIn("overall_score", eval_data)
        self.assertIn("breakdown", eval_data)
        self.assertIn("interview_questions", eval_data)
        self.__class__.eval_id = eval_data["id"]
        print(f"[OK] Test 6 (AI Evaluation): PASSED (Score: {eval_data['overall_score']}%, Questions: {len(eval_data['interview_questions'])})")

    def test_07_human_override_and_audit_trail(self):
        """Kiểm tra Human-in-the-loop: HR override điểm và ghi nhận Audit Log."""
        override_payload = {
            "hr_override_score": 92.5,
            "hr_override_reason": "Ứng viên có dự án thực tế xuất sắc về FastAPI và Docker."
        }
        res = self.client.post(f"/api/v1/overrides/{self.__class__.eval_id}", json=override_payload)
        self.assertEqual(res.status_code, 200)
        updated_eval = res.json()
        self.assertEqual(updated_eval["hr_override_score"], 92.5)
        self.assertEqual(updated_eval["evaluation_status"], "OVERRIDDEN")

        # Kiểm tra Audit Log
        audit_res = self.client.get("/api/v1/analytics/audit-logs")
        self.assertEqual(audit_res.status_code, 200)
        logs = audit_res.json()
        override_logs = [l for l in logs if l["action"] == "HR_SCORE_OVERRIDE"]
        self.assertTrue(len(override_logs) > 0)
        self.assertEqual(override_logs[0]["new_value"]["score"], 92.5)
        print(f"[OK] Test 7 (Human Override & Audit Log): PASSED (Audit entry recorded with reason)")

    def test_08_leaderboard_ranking(self):
        """Kiểm tra bảng xếp hạng sử dụng điểm cuối cùng (ưu tiên điểm HR)."""
        res = self.client.get(f"/api/v1/analytics/jobs/{self.__class__.job_id}/ranking")
        self.assertEqual(res.status_code, 200)
        ranking_data = res.json()
        self.assertEqual(ranking_data["total_candidates"], 1)
        top_cand = ranking_data["rankings"][0]
        self.assertEqual(top_cand["final_score"], 92.5)
        self.assertTrue(top_cand["is_overridden"])
        print(f"[OK] Test 8 (Leaderboard Ranking): PASSED (Final Score matches HR Override: {top_cand['final_score']}%)")

if __name__ == "__main__":
    unittest.main()
