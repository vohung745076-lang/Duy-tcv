/**
 * GOOGLE APPS SCRIPT - EMAIL RELAY WEBHOOK
 * 
 * Hướng dẫn thiết lập trong 1 phút:
 * 1. Truy cập https://script.google.com bằng tài khoản Gmail của bạn (vohung745076@gmail.com).
 * 2. Bấm "Dự án mới" (New project), dán toàn bộ mã nguồn bên dưới vào.
 * 3. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 4. Chọn loại: "Ứng dụng web" (Web app).
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - vohung745076@gmail.com).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 5. Bấm "Triển khai" và cấp quyền truy cập Gmail một lần duy nhất.
 * 6. Copy đường link URL Webhook (có dạng https://script.google.com/macros/s/.../exec).
 * 7. Điền URL này vào biến EMAIL_WEBHOOK_URL trong Render Environment hoặc backend/.env.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var subject = data.subject;
    var htmlBody = data.htmlBody;
    var body = data.body || "";

    if (!to || !subject) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Thiếu trường 'to' hoặc 'subject'"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Gửi email chính thức từ Gmail thật của người dùng
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      htmlBody: htmlBody
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã gửi email thành công từ Gmail!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
