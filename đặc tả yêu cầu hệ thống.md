# TÀI LIỆU ĐẶC TẢ YÊU CẦU HỆ THỐNG (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
**Tên dự án:** HỆ THỐNG HỖ TRỢ ĐÁNH GIÁ VÀ SÀNG LỌC HỒ SƠ ỨNG VIÊN BẰNG TRÍ TUỆ NHÂN TẠO (AI-POWERED CV SCREENING SYSTEM)  
**Phiên bản:** 1.0  
**Đối tượng thực hiện:** Nhóm phát triển đồ án môn học  

---

## 1. MÔ TẢ TỔNG QUAN (SYSTEM OVERVIEW)
Hệ thống là giải pháp ứng dụng Trí tuệ nhân tạo (AI/NLP) hỗ trợ doanh nghiệp tối ưu hóa quy trình tiếp nhận, trích xuất và thẩm định hồ sơ ứng viên (CV). Hệ thống vận hành theo mô hình **Human-in-the-loop (Con người giám sát và ra quyết định)**: AI phân tích ngữ nghĩa, so khớp mức độ tương thích giữa CV và bản mô tả công việc (JD), đưa ra điểm số kèm trích dẫn bằng chứng cụ thể. Quyền quyết định phê duyệt, điều chỉnh điểm số và gửi phản hồi hoàn toàn thuộc về chuyên viên tuyển dụng (HR).

---

## 2. PHÂN TÍCH NGHIỆP VỤ (BUSINESS ANALYSIS)

### 2.1. Bối cảnh doanh nghiệp
Khi doanh nghiệp mở rộng quy mô, phòng Nhân sự (HR) tiếp nhận hàng trăm đến hàng nghìn CV mỗi đợt tuyển dụng. Với nguồn lực giới hạn, việc rà soát thủ công dẫn tới tình trạng kiệt sức vận hành, bỏ sót ứng viên tiềm năng, khó kiểm chứng tính xác thực của thông tin và tiêu chuẩn đánh giá thiếu đồng nhất giữa các chuyên viên.

### 2.2. So sánh quy trình: As-Is vs To-Be

```text
[QUY TRÌNH AS-IS (Hiện tại - Thủ công 100%)]
HR tạo tin JD -> Ứng viên gửi CV -> HR tải CV thủ công -> HR đọc lướt từng file
-> Đối chiếu bằng mắt thường -> Đánh giá cảm tính -> Lập Excel xếp hạng -> Mời phỏng vấn
(Hạn chế: Tốn 15-20 phút/CV, dễ sai sót, không có giải thích nhất quán)

[QUY TRÌNH TO-BE (Đề xuất có AI hỗ trợ)]
HR tạo JD & Tiêu chí chuẩn hóa trên hệ thống
       ↓
Thu thập CV (Upload trực tiếp / Đồng bộ Google Forms)
       ↓
Hệ thống tiền xử lý: Bóc tách text, che mờ thông tin cá nhân nhạy cảm (PII Masking)
       ↓
AI Pipeline: Trích xuất thực thể (Kỹ năng, Kinh nghiệm, Học vấn) & Đối chiếu với JD
       ↓
Hệ thống tính điểm tương thích (Score), trích xuất câu bằng chứng và sinh câu hỏi phỏng vấn
       ↓
HR đối soát trên giao diện Split-View (Xem song song CV gốc vs Bằng chứng của AI)
       ↓
HR phê duyệt hoặc điều chỉnh điểm (Hệ thống ghi nhận Audit Log)
       ↓
Xuất danh sách xếp hạng & Gửi thông báo kết quả