import os
import re
import csv
import io
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import JobDescription
from app.models.candidate import Candidate
from app.services.pdf_service import pdf_service
from app.services.pii_service import pii_service
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class GoogleSyncService:
    @staticmethod
    def parse_google_sheet_url(url: str) -> Tuple[Optional[str], str]:
        """
        Trích xuất Spreadsheet ID và GID từ đường dẫn Google Sheets.
        Hỗ trợ mọi định dạng: /d/{id}/edit, /d/{id}/export, query gid=...
        """
        if not url:
            return None, "0"

        sheet_id_match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url)
        spreadsheet_id = sheet_id_match.group(1) if sheet_id_match else None

        gid_match = re.search(r"[?&#]gid=([0-9]+)", url)
        gid = gid_match.group(1) if gid_match else "0"

        return spreadsheet_id, gid

    @staticmethod
    def extract_drive_file_id(url: str) -> Optional[str]:
        """
        Trích xuất File ID từ đường dẫn Google Drive của file CV.
        Hỗ trợ: drive.google.com/open?id=..., drive.google.com/file/d/..., uc?id=...
        """
        if not url:
            return None

        # Dạng /file/d/{id}/
        match_path = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
        if match_path:
            return match_path.group(1)

        # Dạng ?id={id} hoặc &id={id}
        match_query = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
        if match_query:
            return match_query.group(1)

        # Dạng /open?id={id}
        match_open = re.search(r"open\?id=([a-zA-Z0-9_-]+)", url)
        if match_open:
            return match_open.group(1)

        return None

    def fetch_sheet_rows(self, spreadsheet_id: str, gid: str = "0") -> List[Dict[str, Any]]:
        """
        Tải nội dung CSV từ Google Sheets và ánh xạ tiêu đề cột linh hoạt.
        """
        export_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}"
        req = urllib.request.Request(export_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                csv_bytes = response.read()
                csv_text = csv_bytes.decode("utf-8-sig", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise ValueError("Không có quyền truy cập Google Sheet. Vui lòng chọn Chia sẻ: 'Bất kỳ ai có đường liên kết đều có thể xem'.")
            raise ValueError(f"Lỗi khi kết nối Google Sheets: HTTP {e.code}")
        except Exception as e:
            raise ValueError(f"Không thể kết nối tới Google Sheets: {str(e)}")

        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)
        if not rows:
            return []

        header = [col.strip().lower() for col in rows[0]]
        
        # Nhận diện chỉ mục cột linh hoạt
        name_idx = -1
        email_idx = -1
        phone_idx = -1
        cv_idx = -1
        time_idx = -1

        for idx, col in enumerate(header):
            clean_col = col.replace("_", " ").replace("-", " ")
            if any(k in clean_col for k in ["họ và tên", "ho va ten", "họ tên", "ho ten", "tên", "fullname", "name", "ứng viên"]) and name_idx == -1:
                name_idx = idx
            elif any(k in clean_col for k in ["email", "gmail", "thư điện tử", "mail"]) and email_idx == -1:
                email_idx = idx
            elif any(k in clean_col for k in ["số điện thoại", "so dien thoai", "sđt", "sdt", "phone", "điện thoại", "mobile"]) and phone_idx == -1:
                phone_idx = idx
            elif any(k in clean_col for k in ["link cv", "cv", "file", "tệp", "đính kèm", "drive", "link"]) and cv_idx == -1:
                cv_idx = idx
            elif any(k in clean_col for k in ["dấu thời gian", "dau thoi gian", "timestamp", "thời gian", "time"]) and time_idx == -1:
                time_idx = idx

        parsed_rows = []
        for row_num, row in enumerate(rows[1:], start=2):
            if not row or not any(field.strip() for field in row):
                continue

            name = row[name_idx].strip() if name_idx != -1 and name_idx < len(row) else ""
            email = row[email_idx].strip() if email_idx != -1 and email_idx < len(row) else ""
            phone = row[phone_idx].strip() if phone_idx != -1 and phone_idx < len(row) else ""
            drive_url = row[cv_idx].strip() if cv_idx != -1 and cv_idx < len(row) else ""
            timestamp = row[time_idx].strip() if time_idx != -1 and time_idx < len(row) else ""

            # Nếu không tìm thấy cột tên riêng nhưng có dòng dữ liệu, fallback
            if not name and len(row) > 1:
                name = row[1].strip()

            parsed_rows.append({
                "row_index": row_num,
                "name": name or f"Ứng viên dòng #{row_num}",
                "email": email or None,
                "phone": phone or None,
                "drive_url": drive_url or None,
                "timestamp": timestamp or None,
            })

        return parsed_rows

    def download_drive_pdf(self, drive_url: str) -> Tuple[Optional[bytes], Optional[str], Optional[str]]:
        """
        Tải file PDF từ Google Drive.
        Trả về: (pdf_bytes, filename, error_type)
        error_type: None nếu thành công, "PERMISSION_DENIED", "NOT_FOUND", hoặc "INVALID_FILE"
        """
        file_id = self.extract_drive_file_id(drive_url)
        if not file_id:
            return None, None, "INVALID_URL"

        endpoints = [
            f"https://drive.usercontent.google.com/download?id={file_id}&export=download",
            f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
        ]

        for url in endpoints:
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                })
                with urllib.request.urlopen(req, timeout=25) as resp:
                    data = resp.read()
                    if data.startswith(b"%PDF"):
                        filename = f"CV_Drive_{file_id[:8]}.pdf"
                        return data, filename, None
                    elif b"accounts.google.com" in data or b"ServiceLogin" in data or b"<!doctype html" in data:
                        return None, None, "PERMISSION_DENIED"
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):
                    return None, None, "PERMISSION_DENIED"
                elif e.code == 404:
                    return None, None, "NOT_FOUND"
            except Exception as e:
                logger.warning(f"Thử tải qua {url} thất bại: {e}")

        # Thử tiếp qua Google Apps Script Webhook nếu được cấu hình
        if settings.EMAIL_WEBHOOK_URL:
            try:
                payload = json.dumps({"action": "fetch_drive_file", "fileId": file_id}).encode("utf-8")
                hook_req = urllib.request.Request(
                    settings.EMAIL_WEBHOOK_URL,
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(hook_req, timeout=30) as hook_resp:
                    hook_data = json.loads(hook_resp.read().decode("utf-8"))
                    if hook_data.get("success") and hook_data.get("base64"):
                        import base64
                        pdf_bytes = base64.b64decode(hook_data["base64"])
                        fname = hook_data.get("filename") or f"CV_Drive_{file_id[:8]}.pdf"
                        return pdf_bytes, fname, None
            except Exception as e:
                logger.warning(f"Gọi webhook fetch_drive_file không thành công: {e}")

        return None, None, "PERMISSION_DENIED"

    def sync_and_reconcile(self, job_id: Optional[str], sheet_url: str, db: Session) -> Dict[str, Any]:
        """
        Xử lý toàn diện luồng:
        1. Đọc Google Sheet.
        2. Tải CV từ Google Drive.
        3. Ghi nhận ứng viên vào hệ thống.
        4. Đối soát (kiểm tra trùng lặp, thống kê kết quả).
        """
        spreadsheet_id, gid = self.parse_google_sheet_url(sheet_url)
        if not spreadsheet_id:
            raise ValueError("Đường dẫn Google Sheets không hợp lệ. Vui lòng cung cấp link dạng https://docs.google.com/spreadsheets/d/...")

        # 1. Đọc dữ liệu từ Google Sheet
        sheet_rows = self.fetch_sheet_rows(spreadsheet_id, gid)
        if not sheet_rows:
            return {
                "success": True,
                "sheet_title": f"Spreadsheet {spreadsheet_id[:8]}",
                "total_rows": 0,
                "newly_imported": 0,
                "duplicates_skipped": 0,
                "permission_issues": 0,
                "candidates": [],
                "reconciliation_rows": [],
                "message": "Bảng tính Google Sheets hiện không có dòng dữ liệu nào."
            }

        job = db.query(JobDescription).filter(JobDescription.id == job_id).first() if job_id else None
        effective_job_id = job.id if job else None
        job_title = job.title if job else "Ứng viên tự do / Chung"

        # Đọc danh sách ứng viên đã có để đối soát trùng lặp
        existing_query = db.query(Candidate)
        if effective_job_id:
            existing_candidates = existing_query.filter(Candidate.job_id == effective_job_id).all()
        else:
            existing_candidates = existing_query.all()

        existing_emails = {c.email.lower() for c in existing_candidates if c.email}
        existing_phones = {c.phone.replace(" ", "") for c in existing_candidates if c.phone}
        existing_drives = {c.google_drive_url for c in existing_candidates if c.google_drive_url}

        current_total_candidates = db.query(Candidate).count()

        safe_folder_name = job_id if job_id else "general"
        job_storage_dir = os.path.join(settings.STORAGE_DIR, "uploads", safe_folder_name)
        os.makedirs(job_storage_dir, exist_ok=True)

        reconciliation_rows = []
        created_candidates = []
        newly_imported_count = 0
        duplicates_count = 0
        permission_issues_count = 0

        for row in sheet_rows:
            row_idx = row["row_index"]
            name = row["name"]
            email = row["email"]
            phone = row["phone"]
            drive_url = row["drive_url"]

            # 2. Đối soát trùng lặp
            is_duplicate = False
            duplicate_reason = ""
            if email and email.lower() in existing_emails:
                is_duplicate = True
                duplicate_reason = f"Đã tồn tại trong hệ thống (trùng Email: {email})"
            elif phone and phone.replace(" ", "") in existing_phones:
                is_duplicate = True
                duplicate_reason = f"Đã tồn tại trong hệ thống (trùng SĐT: {phone})"
            elif drive_url and drive_url in existing_drives:
                is_duplicate = True
                duplicate_reason = "Đã tồn tại trong hệ thống (trùng link Google Drive CV)"

            if is_duplicate:
                duplicates_count += 1
                reconciliation_rows.append({
                    "row_index": row_idx,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "drive_url": drive_url,
                    "status": "DUPLICATE",
                    "message": duplicate_reason,
                    "candidate_id": None
                })
                continue

            # 3. Tải CV từ Google Drive
            pdf_bytes = None
            filename = None
            err_type = None

            if drive_url:
                pdf_bytes, filename, err_type = self.download_drive_pdf(drive_url)

            candidate_number = current_total_candidates + newly_imported_count + 1
            clean_filename = filename if filename else f"Candidate_{candidate_number}.pdf"
            file_path = os.path.join(job_storage_dir, f"{candidate_number}_{clean_filename}")

            if pdf_bytes:
                # Ghi file PDF tải được xuống đĩa
                with open(file_path, "wb") as f:
                    f.write(pdf_bytes)

                # Trích xuất văn bản & PII Masking
                raw_text = ""
                masked_text = ""
                try:
                    raw_text = pdf_service.extract_text(file_path)
                    if not raw_text or not raw_text.strip():
                        raw_text = f"Hồ sơ ứng viên: {name} (Nạp từ Google Sheet)"
                    masked_text = pii_service.mask_text(raw_text)
                except Exception as e:
                    raw_text = f"[Hồ sơ ứng viên: {name} - {str(e)}]"
                    masked_text = raw_text

                candidate = Candidate(
                    job_id=effective_job_id,
                    job_title=job_title,
                    original_filename=clean_filename,
                    file_path=file_path,
                    masked_name=name,
                    email=email,
                    phone=phone,
                    google_drive_url=drive_url,
                    raw_text=raw_text,
                    masked_text=masked_text,
                    status="PARSED"
                )
                db.add(candidate)
                created_candidates.append(candidate)
                newly_imported_count += 1

                if email:
                    existing_emails.add(email.lower())
                if phone:
                    existing_phones.add(phone.replace(" ", ""))
                if drive_url:
                    existing_drives.add(drive_url)

                reconciliation_rows.append({
                    "row_index": row_idx,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "drive_url": drive_url,
                    "status": "IMPORTED",
                    "message": "Đã tải file PDF CV thành công từ Google Drive và bóc tách PII",
                    "candidate_id": None # Sẽ cập nhật sau khi commit
                })
            else:
                # Trường hợp không tải được file PDF do lỗi quyền riêng tư hoặc link hỏng
                if err_type == "PERMISSION_DENIED":
                    permission_issues_count += 1
                    status_str = "NEEDS_PERMISSION"
                    msg = "Thư mục Google Drive chưa mở quyền 'Bất kỳ ai có đường liên kết đều có thể xem'."
                else:
                    status_str = "FAILED"
                    msg = "Không tìm thấy file PDF hoặc link Google Drive không hợp lệ."

                # Vẫn ghi nhận ứng viên vào hệ thống để không làm mất thông tin
                candidate = Candidate(
                    job_id=effective_job_id,
                    job_title=job_title,
                    original_filename=f"Pending_Drive_{candidate_number}.pdf",
                    file_path=file_path,
                    masked_name=name,
                    email=email,
                    phone=phone,
                    google_drive_url=drive_url,
                    raw_text=f"Ứng viên {name} - Email: {email} - SĐT: {phone} (Chờ cấp quyền truy cập file PDF trên Google Drive)",
                    masked_text=f"Candidate #{candidate_number:02d} (Chờ cấp quyền truy cập file PDF trên Google Drive)",
                    status="DRIVE_SYNC_PENDING"
                )
                db.add(candidate)
                created_candidates.append(candidate)
                newly_imported_count += 1

                reconciliation_rows.append({
                    "row_index": row_idx,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "drive_url": drive_url,
                    "status": status_str,
                    "message": msg,
                    "candidate_id": None
                })

        db.commit()

        # Lưu bản sao PDF vào candidate_pdfs đối với các hồ sơ tải được
        for c in created_candidates:
            db.refresh(c)
            c.text_preview = c.masked_text[:200] if c.masked_text else ""
            if os.path.exists(c.file_path):
                try:
                    storage_service.save_pdf(db, c.id, c.file_path)
                except Exception as e:
                    logger.warning(f"Lỗi sao lưu PDF candidate_pdfs: {e}")

        # Gán lại candidate_id cho reconciliation_rows
        c_idx = 0
        for r in reconciliation_rows:
            if r["status"] in ("IMPORTED", "NEEDS_PERMISSION", "FAILED") and c_idx < len(created_candidates):
                r["candidate_id"] = created_candidates[c_idx].id
                c_idx += 1

        summary_msg = f"Đã đối soát xong {len(sheet_rows)} hồ sơ: {newly_imported_count} tiếp nhận mới, {duplicates_count} trùng lặp bỏ qua."
        if permission_issues_count > 0:
            summary_msg += f" Phát hiện {permission_issues_count} file cần mở quyền xem trên Google Drive."

        return {
            "success": True,
            "sheet_title": f"Spreadsheet {spreadsheet_id[:8]}",
            "total_rows": len(sheet_rows),
            "newly_imported": newly_imported_count,
            "duplicates_skipped": duplicates_count,
            "permission_issues": permission_issues_count,
            "candidates": created_candidates,
            "reconciliation_rows": reconciliation_rows,
            "message": summary_msg
        }


google_sync_service = GoogleSyncService()
