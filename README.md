# 🚀 AI-Powered CV Screening & Evaluation System
> **Hệ thống hỗ trợ sàng lọc và thẩm định hồ sơ ứng viên bằng Trí tuệ nhân tạo**

[![Status](https://img.shields.io/badge/Status-MVP%20Development-yellow)](#-kế-hoạch-phát-triển-wbs-5-tuần)
[![Architecture](https://img.shields.io/badge/Architecture-Human--in--the--loop-blue)](#-nguyên-lý-hoạt-động-human-in-the-loop)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 Giới thiệu tổng quan
Trong các đợt tuyển dụng lớn, bộ phận nhân sự (HR) thường quá tải khi phải đọc và đối soát hàng trăm CV một cách thủ công, dễ dẫn đến đánh giá cảm tính và bỏ sót ứng viên tiềm năng.

**AI-Powered CV Screening System** là giải pháp hỗ trợ HR tự động hóa quy trình bóc tách dữ liệu từ CV dạng `.pdf`, đối chiếu ngữ nghĩa với bản mô tả công việc (Job Description - JD), tính toán điểm tương thích và trích xuất bằng chứng minh bạch (Explainable AI). Hệ thống tuân thủ nghiêm ngặt nguyên tắc **Human-in-the-loop**: AI chỉ đóng vai trò trợ lý (Copilot) gợi ý, quyền điều chỉnh điểm số và quyết định cuối cùng luôn thuộc về HR.

---

## 🌟 Tính năng cốt lõi (Core Features - MVP)

* **Quản lý vị trí tuyển dụng (JD Management):** Chuẩn hóa tiêu chí chuyên môn, số năm kinh nghiệm và trình độ học vấn.
* **Tiếp nhận & Tiền xử lý CV:** Upload file PDF, tự động trích xuất văn bản và hỗ trợ che mờ thông tin cá nhân nhạy cảm (PII Masking).
* **AI Match Scoring & Explainable Evidence:**
  * Tính điểm tổng quan ($0 - 100\%$) và điểm thành phần (Kỹ năng, Kinh nghiệm, Học vấn).
  * Trích xuất câu/đoạn văn bản nguyên văn từ CV để làm chứng cứ đối soát cho từng tiêu chí.
  * Tự động sinh $3 - 5$ câu hỏi phỏng vấn đào sâu vào các lỗ hổng kiến thức hoặc điểm thiếu sót của ứng viên.
* **Không gian làm việc Split-View (Human-in-the-loop):**
  * Hiển thị song song bản CV gốc (PDF) và kết quả phân tích AI.
  * Cho phép HR ghi đè (override) điểm số kèm lý do bắt buộc.
* **Kiểm toán hoạt động (Audit Trail):** Ghi vết toàn bộ lịch sử chấm điểm của AI và các thao tác điều chỉnh của HR nhằm phục vụ thanh tra, kiểm toán.
* **Bảng điều khiển & Xếp hạng (Dashboard):** Thống kê số lượng hồ sơ và bảng xếp hạng ứng viên theo điểm số thời gian thực.

---

## 🏗 Kiến trúc hệ thống & Công nghệ sử dụng

```text
[Trình duyệt Web (HR/Admin)]
         │
         ▼
[Frontend: React / Next.js (Split-View, PDF Viewer, Charts)]
         │  (RESTful API / JWT Auth)
         ▼
[Backend: Python FastAPI / Node.js]
 ├── PDF Processing Pipeline (pdfplumber / pypdf + PII Masking)
 ├── LLM Orchestrator (Prompt Engineering + JSON Schema Validation)
 └── Database Manager (PostgreSQL / MySQL + ORM)
         │
 ┌───────┴────────────────────────┐
 ▼                                ▼
[AI Engine: Gemini API / LLM]   [Database: PostgreSQL]
                                 ├── Users, Jobs, Candidates
                                 └── Evaluations, Audit_Logs
