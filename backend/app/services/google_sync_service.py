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
        Hỗ trợ: drive.google.com/open?id=..., drive.google.com/file/d/..., uc?id=..., hoặc raw id
        """
        if not url:
            return None

        clean = url.strip()

        # Dạng /file/d/{id}/
        match_path = re.search(r"/file/d/([a-zA-Z0-9_-]+)", clean)
        if match_path:
            return match_path.group(1)

        # Dạng ?id={id} hoặc &id={id}
        match_query = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", clean)
        if match_query:
            return match_query.group(1)

        # Dạng /open?id={id}
        match_open = re.search(r"open\?id=([a-zA-Z0-9_-]+)", clean)
        if match_open:
            return match_open.group(1)

        # Dạng chuỗi ID trực tiếp của Google Drive (25 - 55 ký tự alphanumeric)
        if re.fullmatch(r"[a-zA-Z0-9_-]{25,55}", clean):
            return clean

        return None

    def _fetch_sheet_rows_xlsx(self, spreadsheet_id: str, gid: str = "0") -> Optional[List[Dict[str, Any]]]:
        """
        Tải và phân tích nội dung Google Sheets qua định dạng XLSX để giữ trọn vẹn
        Hyperlink ngầm (chứa link Google Drive thật do Google Form tạo ra).
        """
        xlsx_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=xlsx"
        req = urllib.request.Request(xlsx_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                xlsx_bytes = response.read()
        except Exception as e:
            logger.warning(f"Không thể tải XLSX từ Google Sheet, thử fallback CSV: {e}")
            return None

        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=False)
            sheet = wb.active
            if not sheet:
                return None

            all_rows = list(sheet.iter_rows(values_only=False))
            if not all_rows:
                return []

            # 1. Nhận diện tiêu đề cột
            header_cells = all_rows[0]
            header = [str(c.value).strip().lower() if c.value else "" for c in header_cells]

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
            for row_num, row_cells in enumerate(all_rows[1:], start=2):
                if not any(c.value for c in row_cells if c.value is not None):
                    continue

                def get_cell_val_and_link(cell):
                    if not cell:
                        return "", ""
                    val = str(cell.value).strip() if cell.value is not None else ""
                    link = ""
                    if cell.hyperlink and cell.hyperlink.target:
                        link = str(cell.hyperlink.target).strip()
                    return val, link

                name_val, _ = get_cell_val_and_link(row_cells[name_idx]) if name_idx != -1 and name_idx < len(row_cells) else ("", "")
                email_val, _ = get_cell_val_and_link(row_cells[email_idx]) if email_idx != -1 and email_idx < len(row_cells) else ("", "")
                phone_val, _ = get_cell_val_and_link(row_cells[phone_idx]) if phone_idx != -1 and phone_idx < len(row_cells) else ("", "")
                time_val, _ = get_cell_val_and_link(row_cells[time_idx]) if time_idx != -1 and time_idx < len(row_cells) else ("", "")

                # Ưu tiên lấy Hyperlink thật từ cột CV
                cv_val, cv_link = get_cell_val_and_link(row_cells[cv_idx]) if cv_idx != -1 and cv_idx < len(row_cells) else ("", "")
                drive_url = cv_link if cv_link else cv_val

                # Quét bổ trợ toàn bộ dòng để tìm bất kỳ ô nào có link Google Drive nếu cột CV chưa có link
                if not drive_url or not ("drive.google.com" in drive_url or "docs.google.com" in drive_url):
                    for cell in row_cells:
                        v, l = get_cell_val_and_link(cell)
                        if l and ("drive.google.com" in l or "docs.google.com" in l):
                            drive_url = l
                            break
                        elif v and ("drive.google.com" in v or "docs.google.com" in v):
                            drive_url = v
                            break

                if not name_val and len(row_cells) > 1 and row_cells[1].value:
                    name_val = str(row_cells[1].value).strip()

                parsed_rows.append({
                    "row_index": row_num,
                    "name": name_val or f"Ứng viên dòng #{row_num}",
                    "email": email_val or None,
                    "phone": phone_val or None,
                    "drive_url": drive_url or None,
                    "timestamp": time_val or None,
                })

            logger.info(f"Đọc thành công {len(parsed_rows)} dòng từ Google Sheets qua XLSX (giữ trọn hyperlink).")
            return parsed_rows
        except Exception as e:
            logger.warning(f"Lỗi khi phân tích nội dung XLSX: {e}", exc_info=True)
            return None

    def fetch_sheet_rows(self, spreadsheet_id: str, gid: str = "0") -> List[Dict[str, Any]]:
        """
        Tải nội dung từ Google Sheets:
        - Ưu tiên XLSX để bóc tách chính xác các ô Hyperlink chứa link Drive thật của Google Form.
        - Tự động fallback sang CSV nếu XLSX không khả dụng.
        """
        xlsx_rows = self._fetch_sheet_rows_xlsx(spreadsheet_id, gid)
        if xlsx_rows is not None:
            return xlsx_rows

        # Fallback CSV
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

    def download_drive_pdf(self, drive_url: str, candidate_name: Optional[str] = None) -> Tuple[Optional[bytes], Optional[str], Optional[str]]:
        """
        Tải file PDF từ Google Drive hoặc tìm kiếm file tương ứng trên hệ thống lưu trữ.
        Trả về: (pdf_bytes, filename, error_type)
        error_type: None nếu thành công, "PERMISSION_DENIED", "NOT_FOUND", hoặc "INVALID_FILE"
        """
        if not drive_url:
            return None, None, "INVALID_URL"

        clean_url = drive_url.strip()

        # 1. Trích xuất File ID Google Drive
        file_id = self.extract_drive_file_id(clean_url)
        
        # 2. Thử tải trực tiếp từ Google Drive bằng các endpoints công khai
        if file_id:
            endpoints = [
                f"https://drive.usercontent.google.com/download?id={file_id}&export=download",
                f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t",
                f"https://docs.google.com/uc?id={file_id}&export=download"
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
                        
                        # Xử lý trường hợp Google trả về trang xác nhận tải tệp lớn
                        if b"confirm=" in data:
                            token_match = re.search(r"confirm=([0-9a-zA-Z_-]+)", data.decode("utf-8", errors="ignore"))
                            if token_match:
                                confirm_token = token_match.group(1)
                                confirm_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm={confirm_token}"
                                with urllib.request.urlopen(urllib.request.Request(confirm_url, headers=req.headers), timeout=25) as c_resp:
                                    c_data = c_resp.read()
                                    if c_data.startswith(b"%PDF"):
                                        filename = f"CV_Drive_{file_id[:8]}.pdf"
                                        return c_data, filename, None

                        if b"accounts.google.com" in data or b"ServiceLogin" in data or b"Sign in" in data:
                            logger.info(f"File Drive {file_id} yêu cầu quyền truy cập (Restricted).")
                except urllib.error.HTTPError as e:
                    if e.code in (401, 403):
                        logger.info(f"File Drive {file_id} bị từ chối truy cập HTTP {e.code}")
                    elif e.code == 404:
                        logger.info(f"File Drive {file_id} không tìm thấy (404)")
                except Exception as e:
                    logger.warning(f"Thử tải qua {url} thất bại: {e}")

        # 3. Kiểm tra nếu drive_url là một tên file hoặc file có sẵn trong thư mục uploads
        if clean_url.lower().endswith(".pdf") or ("/" not in clean_url and "\\" not in clean_url):
            target_name = clean_url
            uploads_dir = os.path.join(settings.STORAGE_DIR, "uploads")
            if os.path.exists(uploads_dir):
                for root, _, files in os.walk(uploads_dir):
                    for f in files:
                        if f.lower() == target_name.lower() or (candidate_name and candidate_name.lower() in f.lower() and f.lower().endswith(".pdf")):
                            candidate_path = os.path.join(root, f)
                            try:
                                with open(candidate_path, "rb") as fl:
                                    pdf_data = fl.read()
                                if pdf_data.startswith(b"%PDF"):
                                    return pdf_data, f, None
                            except Exception as e:
                                logger.warning(f"Lỗi đọc file local sẵn có {candidate_path}: {e}")

        # 4. Thử tiếp qua Google Apps Script Webhook nếu được cấu hình
        if settings.EMAIL_WEBHOOK_URL:
            try:
                payload = json.dumps({
                    "action": "fetch_drive_file",
                    "fileId": file_id or "",
                    "filename": clean_url if clean_url.lower().endswith(".pdf") else ""
                }).encode("utf-8")
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
                        fname = hook_data.get("filename") or (f"CV_Drive_{file_id[:8]}.pdf" if file_id else "CV_Google_Drive.pdf")
                        return pdf_bytes, fname, None
            except Exception as e:
                logger.warning(f"Gọi webhook fetch_drive_file không thành công: {e}")

        if not file_id:
            return None, clean_url, "INVALID_URL"

        return None, None, "PERMISSION_DENIED"

    def sync_and_reconcile(
        self,
        job_id: Optional[str],
        sheet_url: str,
        db: Session,
        auto_evaluate: bool = False
    ) -> Dict[str, Any]:
        """
        Xử lý toàn diện luồng:
        1. Đọc Google Sheet (giữ Hyperlink Drive qua XLSX).
        2. Tải CV từ Google Drive (hoặc file local).
        3. Ghi nhận/cập nhật ứng viên vào hệ thống (không bỏ qua hồ sơ chưa có file PDF hoặc có CV mới).
        4. Tự động kích hoạt AI chấm điểm nếu auto_evaluate=True.
        5. Đối soát thống kê kết quả.
        """
        spreadsheet_id, gid = self.parse_google_sheet_url(sheet_url)
        if not spreadsheet_id:
            raise ValueError("Đường dẫn Google Sheets không hợp lệ. Vui lòng cung cấp link dạng https://docs.google.com/spreadsheets/d/...")

        # 1. Đọc dữ liệu từ Google Sheet (ưu tiên XLSX để lấy Hyperlink Drive)
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
                "ready_candidate_ids": [],
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

        existing_by_email = {c.email.lower(): c for c in existing_candidates if c.email}
        existing_by_phone = {c.phone.replace(" ", ""): c for c in existing_candidates if c.phone}

        current_total_candidates = db.query(Candidate).count()

        safe_folder_name = job_id if job_id else "general"
        job_storage_dir = os.path.join(settings.STORAGE_DIR, "uploads", safe_folder_name)
        os.makedirs(job_storage_dir, exist_ok=True)

        reconciliation_rows = []
        created_candidates = []
        ready_candidate_ids = []
        newly_imported_count = 0
        duplicates_count = 0
        permission_issues_count = 0

        for row in sheet_rows:
            row_idx = row["row_index"]
            name = row["name"]
            email = row["email"]
            phone = row["phone"]
            drive_url = row["drive_url"]

            # Đảm bảo drive_url trả về frontend là URL chuẩn hoặc đường dẫn Drive hợp lệ
            file_id_in_row = self.extract_drive_file_id(drive_url or "")
            display_drive_url = drive_url
            if file_id_in_row and (not drive_url or not drive_url.startswith("http")):
                display_drive_url = f"https://drive.google.com/file/d/{file_id_in_row}/view"

            # 2. Đối soát trùng lặp thông minh
            matched_candidate: Optional[Candidate] = None
            duplicate_reason = ""

            if email and email.lower() in existing_by_email:
                matched_candidate = existing_by_email[email.lower()]
                duplicate_reason = f"Đã tồn tại trong hệ thống (trùng Email: {email})"
            elif phone and phone.replace(" ", "") in existing_by_phone:
                matched_candidate = existing_by_phone[phone.replace(" ", "")]
                duplicate_reason = f"Đã tồn tại trong hệ thống (trùng SĐT: {phone})"

            # Kiểm tra xem ứng viên đã có file PDF thật trên ổ đĩa hay chưa
            has_valid_file = False
            if matched_candidate and matched_candidate.file_path:
                has_valid_file = bool(
                    os.path.exists(matched_candidate.file_path) and os.path.getsize(matched_candidate.file_path) > 100
                )

            # Kiểm tra xem link CV mới có khác với CV cũ không
            cand_fid = self.extract_drive_file_id(matched_candidate.google_drive_url or "") if matched_candidate else None
            new_fid = file_id_in_row
            is_same_cv = bool(cand_fid and new_fid and cand_fid == new_fid)

            # Chỉ bỏ qua trùng lặp nếu ứng viên đã có file thật hợp lệ VÀ là cùng 1 file CV đã được xử lý
            if matched_candidate and has_valid_file and is_same_cv and matched_candidate.status in ("PARSED", "EVALUATED"):
                duplicates_count += 1
                reconciliation_rows.append({
                    "row_index": row_idx,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "drive_url": display_drive_url,
                    "status": "DUPLICATE",
                    "message": duplicate_reason,
                    "candidate_id": matched_candidate.id
                })
                if auto_evaluate and matched_candidate.status != "EVALUATED":
                    ready_candidate_ids.append(matched_candidate.id)
                continue

            # 3. Tiến hành tải hoặc cập nhật file CV thật từ Google Drive
            pdf_bytes = None
            filename = None
            err_type = None

            if drive_url:
                pdf_bytes, filename, err_type = self.download_drive_pdf(drive_url, candidate_name=name)

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

                if matched_candidate:
                    # Cập nhật ứng viên đã chờ file hoặc nộp CV mới
                    candidate = matched_candidate
                    candidate.original_filename = clean_filename
                    candidate.file_path = file_path
                    candidate.masked_name = name
                    candidate.google_drive_url = display_drive_url
                    candidate.raw_text = raw_text
                    candidate.masked_text = masked_text
                    candidate.status = "PARSED"
                    candidate.text_preview = masked_text[:200]
                else:
                    candidate = Candidate(
                        job_id=effective_job_id,
                        job_title=job_title,
                        original_filename=clean_filename,
                        file_path=file_path,
                        masked_name=name,
                        email=email,
                        phone=phone,
                        google_drive_url=display_drive_url,
                        raw_text=raw_text,
                        masked_text=masked_text,
                        status="PARSED"
                    )
                    db.add(candidate)

                created_candidates.append(candidate)
                newly_imported_count += 1

                if email:
                    existing_by_email[email.lower()] = candidate
                if phone:
                    existing_by_phone[phone.replace(" ", "")] = candidate

                reconciliation_rows.append({
                    "row_index": row_idx,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "drive_url": display_drive_url,
                    "status": "IMPORTED",
                    "message": "Đã tải file PDF CV thật 100% từ Google Drive và bóc tách nội dung",
                    "candidate_id": None # Sẽ cập nhật sau commit
                })
            else:
                # Không tải được do quyền riêng tư hoặc link hỏng
                if err_type == "PERMISSION_DENIED":
                    permission_issues_count += 1
                    status_str = "NEEDS_PERMISSION"
                    msg = "File Google Drive bị hạn chế quyền riêng tư. Vui lòng mở quyền 'Bất kỳ ai có đường liên kết đều có thể xem'."
                else:
                    status_str = "FAILED"
                    msg = "Không thể kết nối tải file từ Google Drive."

                if matched_candidate:
                    candidate = matched_candidate
                    candidate.status = "DRIVE_SYNC_PENDING"
                    candidate.google_drive_url = display_drive_url
                else:
                    candidate = Candidate(
                        job_id=effective_job_id,
                        job_title=job_title,
                        original_filename=f"Pending_Drive_{candidate_number}.pdf",
                        file_path=file_path,
                        masked_name=name,
                        email=email,
                        phone=phone,
                        google_drive_url=display_drive_url,
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
                    "drive_url": display_drive_url,
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
            if c.status == "PARSED":
                ready_candidate_ids.append(c.id)

        # Gán lại candidate_id cho reconciliation_rows
        c_idx = 0
        for r in reconciliation_rows:
            if r["status"] in ("IMPORTED", "NEEDS_PERMISSION", "FAILED") and c_idx < len(created_candidates):
                r["candidate_id"] = created_candidates[c_idx].id
                c_idx += 1

        # Tự động AI Screening nếu auto_evaluate = True và có hồ sơ sẵn sàng
        if auto_evaluate and ready_candidate_ids and effective_job_id:
            from app.services.evaluation_flow import batch_evaluate_candidates
            logger.info(f"Kích hoạt tự động AI Screening cho {len(ready_candidate_ids)} hồ sơ mới nạp.")
            batch_evaluate_candidates(ready_candidate_ids, effective_job_id, performed_by="GOOGLE_SYNC_AUTO_AI")
            for c in created_candidates:
                db.refresh(c)

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
            "ready_candidate_ids": ready_candidate_ids,
            "message": summary_msg
        }


google_sync_service = GoogleSyncService()
