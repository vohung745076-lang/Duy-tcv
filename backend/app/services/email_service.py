import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service chịu trách nhiệm gửi email mời phỏng vấn thật qua SMTP (Gmail / Custom SMTP)."""

    def send_interview_email(
        self,
        to_email: str,
        candidate_name: str,
        interview_type: str,
        interview_time: str,
        interview_location: str,
        interviewer_name: Optional[str] = "Hội đồng Tuyển dụng Doanh nghiệp",
        custom_notes: Optional[str] = None
    ) -> bool:
        """
        Gửi email HTML gửi thư mời phỏng vấn tới ứng viên.
        Trả về True nếu gửi thành công qua SMTP, False nếu chưa cấu hình hoặc lỗi.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("SMTP_USER hoặc SMTP_PASSWORD chưa được cấu hình trong .env. Email không thể gửi đi thực tế.")
            return False

        subject = f"[Thư Mời Phỏng Vấn] - Vị trí Ứng tuyển dành cho {candidate_name}"
        type_label = "Phỏng vấn Online (Google Meet / Teams)" if interview_type == "ONLINE" else "Phỏng vấn Trực tiếp tại Trụ sở Doanh nghiệp"

        # HTML Template đẹp mắt cho Email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f6f9; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
                .header {{ background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%); color: #ffffff; padding: 30px 25px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
                .content {{ padding: 30px 25px; }}
                .info-box {{ background: #f8fafc; border-left: 4px solid #0284c7; padding: 15px 20px; border-radius: 6px; margin: 20px 0; }}
                .info-item {{ margin-bottom: 10px; font-size: 14px; }}
                .info-item strong {{ color: #0f172a; width: 140px; display: inline-block; }}
                .footer {{ background: #f1f5f9; padding: 20px 25px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>THƯ MỜI PHỎNG VẤN THỰC TẾ</h1>
                </div>
                <div class="content">
                    <p>Kính gửi Anh/Chị <strong>{candidate_name}</strong>,</p>
                    <p>Lời đầu tiên, Ban Tuyển dụng xin gửi lời cảm ơn Anh/Chị đã dành thời gian nộp hồ sơ ứng tuyển vào doanh nghiệp của chúng tôi.</p>
                    <p>Sau khi xem xét chi tiết hồ sơ CV, chúng tôi rất ấn tượng với năng lực của Anh/Chị và trân trọng kính mời Anh/Chị tham dự buổi phỏng vấn chính thức:</p>
                    
                    <div class="info-box">
                        <div class="info-item"><strong>Hình thức:</strong> {type_label}</div>
                        <div class="info-item"><strong>Thời gian:</strong> {interview_time}</div>
                        <div class="info-item"><strong>Địa điểm / Link:</strong> <a href="{interview_location}" style="color:#0284c7;">{interview_location}</a></div>
                        <div class="info-item"><strong>Hội đồng PV:</strong> {interviewer_name}</div>
                        {f'<div class="info-item"><strong>Ghi chú:</strong> {custom_notes}</div>' if custom_notes else ''}
                    </div>

                    <p>Anh/Chị vui lòng phản hồi lại email này để xác nhận tham dự. Nếu có điều chỉnh về thời gian, xin vui lòng thông báo sớm cho chúng tôi.</p>
                    <p>Trân trọng,<br><strong>{interviewer_name}</strong><br>Bộ phận Tuyển dụng Nhân sự</p>
                </div>
                <div class="footer">
                    Email này được gửi tự động từ Hệ thống Quản trị Nhân sự & Sàng lọc CV AI.
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            logger.info(f"Đã gửi email phỏng vấn thật tới {to_email} thành công qua SMTP.")
            return True
        except Exception as e:
            logger.error(f"Lỗi khi kết nối SMTP để gửi email tới {to_email}: {str(e)}")
            return False

email_service = EmailService()
