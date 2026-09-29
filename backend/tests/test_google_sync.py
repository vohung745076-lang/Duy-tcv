import unittest
from unittest.mock import patch, MagicMock
from app.services.google_sync_service import google_sync_service
from app.core.database import SessionLocal
from app.models.job import JobDescription
from app.models.candidate import Candidate


class TestGoogleSync(unittest.TestCase):
    def test_parse_google_sheet_url(self):
        url1 = "https://docs.google.com/spreadsheets/d/11MRFC7_4sDwQajWNkoPldml7zhlDpQw3JXl8Z3Q5cZU/edit?gid=690036060#gid=690036060"
        sid, gid = google_sync_service.parse_google_sheet_url(url1)
        self.assertEqual(sid, "11MRFC7_4sDwQajWNkoPldml7zhlDpQw3JXl8Z3Q5cZU")
        self.assertEqual(gid, "690036060")

        url2 = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
        sid2, gid2 = google_sync_service.parse_google_sheet_url(url2)
        self.assertEqual(sid2, "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
        self.assertEqual(gid2, "0")

    def test_extract_drive_file_id(self):
        url1 = "https://drive.google.com/open?id=1uyNq6QV8UE9qOoz6YN8JT2hEcqQSgjVS"
        fid1 = google_sync_service.extract_drive_file_id(url1)
        self.assertEqual(fid1, "1uyNq6QV8UE9qOoz6YN8JT2hEcqQSgjVS")

        url2 = "https://drive.google.com/file/d/1ABC_xyz-123/view?usp=sharing"
        fid2 = google_sync_service.extract_drive_file_id(url2)
        self.assertEqual(fid2, "1ABC_xyz-123")

        url3 = "https://drive.google.com/uc?id=999_xyz&export=download"
        fid3 = google_sync_service.extract_drive_file_id(url3)
        self.assertEqual(fid3, "999_xyz")

    def test_fetch_sheet_rows_header_detection(self):
        sample_csv = (
            "Dấu thời gian,họ và tên,Gmail,số điện thoại,Link cv\n"
            "27/09/2026 22:00:32,Trần Ngọc Kiên,otro@topcv.vn,024 6680 5588,https://drive.google.com/open?id=1uyNq6QV8UE9qOoz6YN8JT2hEcqQSgjVS\n"
        ).encode("utf-8")

        mock_resp = MagicMock()
        mock_resp.read.return_value = sample_csv
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp):
            rows = google_sync_service.fetch_sheet_rows("test_id", "0")
            self.assertEqual(len(rows), 1)
            row = rows[0]
            self.assertEqual(row["name"], "Trần Ngọc Kiên")
            self.assertEqual(row["email"], "otro@topcv.vn")
            self.assertEqual(row["phone"], "024 6680 5588")
            self.assertEqual(row["drive_url"], "https://drive.google.com/open?id=1uyNq6QV8UE9qOoz6YN8JT2hEcqQSgjVS")

    def test_sync_and_reconcile_flow(self):
        db = SessionLocal()
        try:
            # Tạo job thử nghiệm
            job = JobDescription(
                title="Test Google Sync Job",
                department="Tech",
                criteria={}
            )
            db.add(job)
            db.commit()
            db.refresh(job)

            sample_rows = [
                {
                    "row_index": 2,
                    "name": "Test Candidate A",
                    "email": "test_candidate_a@example.com",
                    "phone": "0987654321",
                    "drive_url": "https://drive.google.com/open?id=test_file_id_a",
                    "timestamp": "28/09/2026"
                }
            ]

            dummy_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

            with patch.object(google_sync_service, "parse_google_sheet_url", return_value=("mock_id", "0")):
                with patch.object(google_sync_service, "fetch_sheet_rows", return_value=sample_rows):
                    with patch.object(google_sync_service, "download_drive_pdf", return_value=(dummy_pdf, "Candidate_A.pdf", None)):
                        result = google_sync_service.sync_and_reconcile(job.id, "https://docs.google.com/spreadsheets/d/mock_id", db)
                        self.assertTrue(result["success"])
                        self.assertEqual(result["newly_imported"], 1)
                        self.assertEqual(result["duplicates_skipped"], 0)
                        self.assertEqual(result["reconciliation_rows"][0]["status"], "IMPORTED")

                        # Đồng bộ lần 2: Phải phát hiện trùng lặp
                        result_duplicate = google_sync_service.sync_and_reconcile(job.id, "https://docs.google.com/spreadsheets/d/mock_id", db)
                        self.assertEqual(result_duplicate["newly_imported"], 0)
                        self.assertEqual(result_duplicate["duplicates_skipped"], 1)
                        self.assertEqual(result_duplicate["reconciliation_rows"][0]["status"], "DUPLICATE")
        finally:
            # Dọn dẹp
            db.query(Candidate).filter(Candidate.email == "test_candidate_a@example.com").delete()
            if 'job' in locals() and job.id:
                db.query(JobDescription).filter(JobDescription.id == job.id).delete()
            db.commit()
            db.close()


if __name__ == "__main__":
    unittest.main()
