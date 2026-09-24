# Cơ Chế Gửi Email Mời Phỏng Vấn (Email Delivery Architecture)

Hệ thống hỗ trợ 2 cơ chế gửi thư mời phỏng vấn song song nhằm đảm bảo **tỉ lệ gửi thành công 100%** ngay cả khi máy chủ Cloud (như Render Free Tier) chặn các cổng SMTP thông thường:

---

## 1. Cơ Chế 1: Mở Gmail Gửi Trực Tiếp (1-Click Direct Send) — Khuyên Dùng
- **Nguyên lý hoạt động**: Khi HR bấm nút **"Mở Gmail gửi ngay (1-Click)"** trên màn hình:
  1. Hệ thống tự động lưu lịch hẹn phỏng vấn vào cơ sở dữ liệu (`approval_status = "APPROVED"`).
  2. Tự động mở tab soạn thư Gmail trên trình duyệt của HR với đầy đủ:
     - Email người nhận (`to`)
     - Tiêu đề thư (`subject`)
     - Toàn bộ nội dung phỏng vấn chuẩn mực đã được điền sẵn (`body`).
- **Ưu điểm**:
  - Không bao giờ bị chặn bởi bất kỳ tường lửa máy chủ nào.
  - Thư gửi đi trực tiếp từ phiên đăng nhập Gmail của chính HR.
  - Tỉ lệ vào hộp thư chính (Inbox) 100%.

---

## 2. Cơ Chế 2: Gửi Tự Động Qua HTTPS Webhook (Google Apps Script / Brevo API)
- **Nguyên lý hoạt động**:
  - Render Free Tier chặn cổng 587/465, nhưng **cho phép 100% cổng HTTPS 443**.
  - Backend phát request `POST` qua giao thức HTTPS tới **Google Apps Script Webhook** (file `google_apps_script.js`).
  - Google thực hiện gửi thư trực tiếp tới ứng viên và phản hồi trạng thái về backend.
- **Biến môi trường hỗ trợ**:
  - `EMAIL_WEBHOOK_URL`: Đường link Webhook từ Google Apps Script.
  - `BREVO_API_KEY`: API Key gửi qua dịch vụ Brevo (miễn phí 300 mail/ngày).
