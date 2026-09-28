import re
from typing import Optional

def render_rejection_email_html(
    candidate_name: str,
    job_title: str,
    rejection_reason: str,
    sender_name: Optional[str] = "Ban Tuyển Dụng & Nhân Sự",
    company_name: Optional[str] = "Hệ thống Tuyển dụng Doanh nghiệp",
    custom_body: Optional[str] = None
) -> str:
    """Tạo mẫu email HTML phản hồi từ chối ứng viên lịch sự, tinh tế và chuyên nghiệp."""
    if custom_body:
        # Nếu HR có chỉnh sửa thủ công nội dung
        paragraphs = [p.strip() for p in custom_body.strip().split("\n") if p.strip()]
        content_html = "".join([f"<p style='margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;'>{p}</p>" for p in paragraphs])
    else:
        content_html = f"""
            <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Kính gửi Anh/Chị <strong style="color: #0f172a;">{candidate_name}</strong>,
            </p>
            <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Lời đầu tiên, {sender_name} xin gửi lời cảm ơn chân thành đến Anh/Chị vì đã quan tâm và dành thời gian nộp hồ sơ ứng tuyển cho vị trí <strong style="color: #0369a1;">{job_title}</strong> tại tổ chức của chúng tôi.
            </p>
            <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Hội đồng tuyển dụng đã xem xét và đánh giá rất kỹ lưỡng hồ sơ năng lực cũng như kinh nghiệm làm việc của Anh/Chị. Tuy nhiên, do yêu cầu chuyên biệt của đợt tuyển dụng lần này và số lượng hồ sơ ứng tuyển lớn, chúng tôi rất tiếc phải thông báo hiện tại chưa thể đồng hành cùng Anh/Chị ở vị trí này.
            </p>
            
            <!-- KHỐI PHẢN HỒI LÝ DO CHI TIẾT & TINH TẾ -->
            <div style="background-color: #f8fafc; border-left: 4px solid #64748b; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Thông tin phản hồi từ Hội đồng Tuyển dụng:
                </div>
                <div style="font-size: 14px; color: #334155; line-height: 1.6;">
                    {rejection_reason}
                </div>
            </div>

            <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Chúng tôi rất trân trọng tiềm năng của Anh/Chị và xin phép được lưu lại thông tin hồ sơ trong hệ thống nguồn nhân tài (Talent Pool) để chủ động liên hệ lại ngay khi có các vị trí mới phù hợp hơn với thế mạnh của Anh/Chị trong tương lai.
            </p>
            <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Chúc Anh/Chị luôn dồi dào sức khỏe và gặt hái được nhiều thành công rực rỡ trên con đường sự nghiệp sắp tới.
            </p>
            <p style="margin: 22px 0 0 0; font-size: 15px; color: #1e293b; line-height: 1.65;">
                Trân trọng,<br>
                <strong style="color: #0f172a;">{sender_name}</strong><br>
                <span style="color: #64748b; font-size: 13px;">{company_name}</span>
            </p>
        """

    subject = f"[Thư Cảm Ơn & Phản Hồi Kết Quả] - Vị trí {job_title} | {candidate_name}"

    html = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: Arial, 'Segoe UI', Roboto, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 10px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px 24px; text-align: center;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                                THƯ CẢM ƠN & PHẢN HỒI KẾT QUẢ
                            </div>
                            <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 1.3;">
                                THÔNG BÁO VỀ HỒ SƠ ỨNG TUYỂN
                            </h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
                                Vị trí: {job_title}
                            </p>
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="padding: 30px 24px; background-color: #ffffff;">
                            {content_html}
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                                {company_name}
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                                Thư này được gửi từ Hệ thống Tuyển dụng Nhân sự. Thông tin phản hồi được lưu trữ bảo mật theo quy định tuyển dụng.
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
    return html
