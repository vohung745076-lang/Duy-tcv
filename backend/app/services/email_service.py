import smtplib
import logging
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service chịu trách nhiệm gửi email mời phỏng vấn thật qua SMTP (Gmail / Custom SMTP)."""

    def _format_custom_body_to_html(self, body_text: str, interview_location: Optional[str] = None) -> str:
        """Chuyển đổi văn bản soạn thảo của HR thành HTML chuẩn email với các khối thông tin nổi bật."""
        lines = body_text.strip().split("\n")
        html_parts = []
        bullet_items = []

        def flush_bullets():
            nonlocal bullet_items
            if bullet_items:
                items_html = "".join([
                    f"<div style='margin-bottom: 8px; font-size: 14px; color: #1e293b; line-height: 1.6;'>{item}</div>"
                    for item in bullet_items
                ])
                html_parts.append(f"""
                    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
                        {items_html}
                    </div>
                """)
                bullet_items = []

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                flush_bullets()
                continue

            # Tự động gắn thẻ strong cho tiêu đề mục bắt đầu bằng • hoặc - hoặc *
            if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                cleaned = re.sub(r"^[•\-\*]\s*", "", line)
                # Tự động in đậm phần trước dấu 2 chấm
                if ":" in cleaned:
                    label, val = cleaned.split(":", 1)
                    # Linkify nếu là URL
                    val_clean = val.strip()
                    if val_clean.startswith("http://") or val_clean.startswith("https://"):
                        val_html = f"<a href='{val_clean}' target='_blank' style='color: #0284c7; text-decoration: underline; font-weight: 600;'>{val_clean}</a>"
                    else:
                        val_html = val_clean
                    bullet_items.append(f"<strong style='color: #0f172a;'>• {label.strip()}:</strong> {val_html}")
                else:
                    bullet_items.append(f"• {cleaned}")
            else:
                flush_bullets()
                # Thường là lời mở đầu hoặc kết thư
                # Linkify bất kỳ URL nào xuất hiện trong văn bản
                formatted_line = re.sub(
                    r'(https?://[^\s]+)',
                    r"<a href='\1' target='_blank' style='color: #0284c7; text-decoration: underline; font-weight: 600;'>\1</a>",
                    line
                )
                html_parts.append(f"<p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; line-height: 1.65;'>{formatted_line}</p>")

        flush_bullets()
        return "".join(html_parts)

    def send_interview_email(
        self,
        to_email: str,
        candidate_name: str,
        interview_type: str,
        interview_time: str,
        interview_location: str,
        interviewer_name: Optional[str] = "Hội đồng Tuyển dụng Doanh nghiệp",
        custom_notes: Optional[str] = None,
        email_subject: Optional[str] = None,
        email_body: Optional[str] = None
    ) -> tuple[bool, str]:
        """
        Gửi email HTML mời phỏng vấn tới ứng viên với cơ chế đa kênh:
        1. Ưu tiên Google Apps Script Webhook qua HTTPS (Port 443, miễn phí, không bao giờ bị Cloud chặn).
        2. Brevo REST API qua HTTPS (Port 443).
        3. Dự phòng SMTP trực tiếp (dành cho local hoặc máy chủ không chặn port 587).
        """
        import requests

        subject = email_subject if email_subject else f"[Thư Mời Phỏng Vấn] - Vị trí Tuyển dụng dành cho {candidate_name}"
        type_label = "Phỏng vấn Online (Google Meet / Teams)" if interview_type == "ONLINE" else "Phỏng vấn Trực tiếp tại Doanh nghiệp"

        # Nếu HR có chỉnh sửa trong textarea
        if email_body:
            content_section = self._format_custom_body_to_html(email_body, interview_location)
        else:
            is_url = interview_location.startswith("http://") or interview_location.startswith("https://")
            location_display = f"<a href='{interview_location}' target='_blank' style='color: #0284c7; text-decoration: underline; font-weight: 600;'>{interview_location}</a>" if is_url else interview_location
            content_section = f"""
                <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">Kính gửi Anh/Chị <strong style="color: #0f172a;">{candidate_name}</strong>,</p>
                <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">Lời đầu tiên, Ban Tuyển dụng xin gửi lời cảm ơn Anh/Chị đã dành thời gian nộp hồ sơ ứng tuyển vào doanh nghiệp của chúng tôi.</p>
                <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">Sau khi xem xét chi tiết hồ sơ CV năng lực, chúng tôi đánh giá cao kinh nghiệm cũng như tiềm năng của Anh/Chị và trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn chính thức:</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
                    <div style="margin-bottom: 10px; font-size: 14px; color: #1e293b;"><strong style="color: #0f172a; width: 140px; display: inline-block;">• Hình thức:</strong> {type_label}</div>
                    <div style="margin-bottom: 10px; font-size: 14px; color: #1e293b;"><strong style="color: #0f172a; width: 140px; display: inline-block;">• Thời gian:</strong> <span style="color: #0284c7; font-weight: 700;">{interview_time}</span></div>
                    <div style="margin-bottom: 10px; font-size: 14px; color: #1e293b;"><strong style="color: #0f172a; width: 140px; display: inline-block;">• Địa điểm / Link:</strong> {location_display}</div>
                    <div style="margin-bottom: 10px; font-size: 14px; color: #1e293b;"><strong style="color: #0f172a; width: 140px; display: inline-block;">• Hội đồng PV:</strong> {interviewer_name}</div>
                    {f'<div style="margin-bottom: 6px; font-size: 14px; color: #1e293b;"><strong style="color: #0f172a; width: 140px; display: inline-block;">• Ghi chú:</strong> {custom_notes}</div>' if custom_notes else ''}
                </div>

                <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">Anh/Chị vui lòng phản hồi lại email này để xác nhận tham dự. Nếu có bất kỳ điều chỉnh nào về khung thời gian, xin vui lòng thông báo sớm cho chúng tôi.</p>
                <p style="margin: 20px 0 0 0; font-size: 15px; color: #1e293b; line-height: 1.65;">Trân trọng,<br><strong style="color: #0f172a;">{interviewer_name}</strong><br><span style="color: #64748b; font-size: 13px;">Bộ phận Nhân sự & Tuyển dụng</span></p>
            """

        html_content = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: Arial, 'Segoe UI', Roboto, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 10px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 24px; text-align: center;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                                THƯ MỜI CHÍNH THỨC
                            </div>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 1.3;">
                                THƯ MỜI PHỎNG VẤN ỨNG VIÊN
                            </h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0f2fe;">
                                Hệ thống Tuyển dụng & Đánh giá Năng lực Doanh nghiệp
                            </p>
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="padding: 30px 24px; background-color: #ffffff;">
                            {content_section}
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                                Hệ thống Quản trị Tuyển dụng & Sàng lọc CV AI
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                                Email này được gửi tự động. Vui lòng phản hồi (Reply) trực tiếp tới email này để xác nhận lịch phỏng vấn.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        # 1. ƯU TIÊN 1: Gửi qua Google Apps Script Webhook HTTPS (Port 443)
        if settings.EMAIL_WEBHOOK_URL:
            try:
                resp = requests.post(
                    settings.EMAIL_WEBHOOK_URL,
                    json={
                        "to": to_email,
                        "subject": subject,
                        "body": email_body or "",
                        "htmlBody": html_content
                    },
                    timeout=10
                )
                if resp.status_code == 200:
                    logger.info(f"Đã gửi email qua Google Webhook tới {to_email}")
                    return True, f"Đã gửi email mời phỏng vấn thành công tới {to_email} qua Google Webhook!"
            except Exception as e:
                logger.error(f"Lỗi gửi qua Google Webhook: {str(e)}")

        # 2. ƯU TIÊN 2: Gửi qua Brevo API HTTPS (Port 443)
        if settings.BREVO_API_KEY:
            try:
                headers = {
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json"
                }
                data = {
                    "sender": {"name": settings.SMTP_FROM_NAME, "email": settings.SMTP_USER},
                    "to": [{"email": to_email, "name": candidate_name}],
                    "subject": subject,
                    "htmlContent": html_content
                }
                resp = requests.post("https://api.brevo.com/v3/smtp/email", headers=headers, json=data, timeout=10)
                if resp.status_code in [200, 201, 202]:
                    logger.info(f"Đã gửi email qua Brevo API tới {to_email}")
                    return True, f"Đã gửi email thành công qua Brevo API tới {to_email}!"
            except Exception as e:
                logger.error(f"Lỗi gửi qua Brevo API: {str(e)}")

        # 3. DỰ PHÒNG: Thử gửi trực tiếp qua SMTP với timeout ngắn 3s (nếu môi trường không bị chặn port 587)
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            try:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3) as server:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
                logger.info(f"Đã gửi email phỏng vấn thật tới {to_email} qua SMTP.")
                return True, f"Đã gửi email mời phỏng vấn tới {to_email} thành công!"
            except Exception as e:
                logger.warning(f"SMTP trực tiếp không kết nối được (do Cloud chặn cổng 587/465): {str(e)}")

        return False, "Máy chủ đám mây (Render Free) chặn cổng SMTP (587/465). Bạn vui lòng dùng nút 'Mở Gmail gửi ngay (1-Click)' trên giao diện để gửi trực tiếp từ Gmail!"

email_service = EmailService()

