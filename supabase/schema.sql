-- ==============================================================================================
-- DỰ ÁN: AI-POWERED CV SCREENING & RECRUITMENT MANAGEMENT SYSTEM
-- HỆ CƠ SỞ DỮ LIỆU CHUẨN HOÁ TRÊN SUPABASE (POSTGRESQL)
-- 
-- NGUYÊN TẮC THIẾT KẾ:
-- 1. Phân tách rõ ràng 5 bảng nghiệp vụ độc lập, không gộp chung cấu trúc.
-- 2. Đảm bảo toàn vẹn dữ liệu qua Foreign Keys và Cascading Rules.
-- 3. Đánh chỉ mục (Indexes) tối ưu hóa truy vấn tìm kiếm và thống kê.
-- 4. Bật Row Level Security (RLS) bảo vệ từng bảng theo phân quyền vai trò (Admin / Recruiter).
-- ==============================================================================================

-- Bật extension mở rộng cần thiết cho UUID (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================================
-- PHẦN 1: ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU ENUM
-- ==============================================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'RECRUITER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================================
-- BẢNG 1: PROFILES (Quản lý Thông tin & Phân quyền Người dùng/Nhân sự)
-- Liên kết trực tiếp 1-1 với bảng xác thực auth.users của Supabase
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'RECRUITER'::user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================================
-- BẢNG 2: JOB_DESCRIPTIONS (Quản lý Vị trí Tuyển dụng & Tiêu chí Đánh giá)
-- Lưu trữ thông tin công việc, trọng số tiêu chí chấm điểm và trạng thái tuyển dụng
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.job_descriptions (
    id TEXT PRIMARY KEY, -- Sử dụng định dạng UUID v4 dạng chuỗi
    title TEXT NOT NULL,
    department TEXT,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- Trọng số skills, experience, education, tiêu chí cốt lõi
    status TEXT NOT NULL DEFAULT 'OPEN',        -- 'OPEN', 'CLOSED', 'DRAFT'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.job_descriptions(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.job_descriptions(created_at DESC);

-- ==============================================================================================
-- BẢNG 3: CANDIDATES (Quản lý Hồ sơ Ứng viên & Xử lý Ẩn danh PII)
-- Lưu thông tin file CV, văn bản gốc và văn bản đã che thông tin nhạy cảm để chống thiên vị
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.candidates (
    id TEXT PRIMARY KEY, -- Sử dụng định dạng UUID v4 dạng chuỗi
    job_id TEXT NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    masked_name TEXT NOT NULL,                  -- Ví dụ: "Ứng viên #01", "Ứng viên #02"
    raw_text TEXT,                              -- Nội dung text trích xuất từ file gốc
    masked_text TEXT,                           -- Nội dung text sau khi loại bỏ thông tin PII
    status TEXT NOT NULL DEFAULT 'SUBMITTED',   -- 'SUBMITTED', 'PARSED', 'EVALUATED', 'SHORTLISTED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON public.candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);

-- ==============================================================================================
-- BẢNG 3B: CANDIDATE_PDFS (Luồng Lưu trữ Tài liệu PDF Độc lập & Bảo mật)
-- Lưu bản sao PDF mã hóa Base64 kết nối 1-1 với candidates bằng khóa ngoại candidate_id
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.candidate_pdfs (
    candidate_id TEXT PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
    pdf_base64 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_pdfs_candidate_id ON public.candidate_pdfs(candidate_id);

-- ==============================================================================================
-- BẢNG 4: EVALUATIONS (Quản lý Kết quả Chấm điểm AI & Phản hồi Nhân sự)
-- Lưu điểm số chi tiết từng phần, bằng chứng trích dẫn, câu hỏi phỏng vấn và điểm HR ghi đè
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.evaluations (
    id TEXT PRIMARY KEY, -- Sử dụng định dạng UUID v4 dạng chuỗi
    candidate_id TEXT NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
    
    -- Thang điểm đánh giá của AI (0.00 - 100.00)
    overall_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    skills_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    experience_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    education_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Phân tích định tính & Bằng chứng xác thực từ AI
    breakdown JSONB DEFAULT '{}'::jsonb,              -- Trích dẫn nguyên văn bằng chứng (evidence citations)
    interview_questions JSONB DEFAULT '[]'::jsonb,    -- Gợi ý bộ câu hỏi phỏng vấn
    ai_summary TEXT,                                  -- Đánh giá tổng quan ưu/nhược điểm
    
    -- Cơ chế Human-In-The-Loop (HR can thiệp & ghi đè điểm)
    hr_override_score NUMERIC(5, 2),
    hr_override_reason TEXT,
    evaluation_status TEXT NOT NULL DEFAULT 'AI_EVALUATED', -- 'AI_EVALUATED', 'HR_VERIFIED', 'OVERRIDDEN'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON public.evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_job_id ON public.evaluations(job_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_overall_score ON public.evaluations(overall_score DESC);

-- ==============================================================================================
-- BẢNG 5: AUDIT_LOGS (Nhật ký Kiểm toán & Truy vết Thay đổi Dữ liệu)
-- Ghi lại mọi thao tác AI chấm điểm và sự can thiệp của HR để phục vụ thanh tra/kiểm tra
-- ==============================================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY, -- Sử dụng định dạng UUID v4 dạng chuỗi
    evaluation_id TEXT REFERENCES public.evaluations(id) ON DELETE SET NULL,
    user_id TEXT,                                      -- ID của User/HR hoặc 'SYSTEM_AI'
    action TEXT NOT NULL,                              -- 'AI_SCORED', 'HR_OVERRIDE', 'STATUS_CHANGED'
    old_value JSONB,                                   -- Trạng thái dữ liệu cũ
    new_value JSONB,                                   -- Trạng thái dữ liệu mới sau khi sửa
    justification TEXT,                                -- Lý do giải trình cho sự thay đổi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_evaluation_id ON public.audit_logs(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================================
-- PHẦN 2: THIẾT LẬP BẢO MẬT ROW LEVEL SECURITY (RLS)
-- ==============================================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policies cho PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 2. Policies cho JOB_DESCRIPTIONS (Người dùng đã đăng nhập có thể xem và tạo công việc)
DROP POLICY IF EXISTS "Authenticated users can manage jobs" ON public.job_descriptions;
CREATE POLICY "Authenticated users can manage jobs" ON public.job_descriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Policies cho CANDIDATES
DROP POLICY IF EXISTS "Authenticated users can manage candidates" ON public.candidates;
CREATE POLICY "Authenticated users can manage candidates" ON public.candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Policies cho EVALUATIONS
DROP POLICY IF EXISTS "Authenticated users can manage evaluations" ON public.evaluations;
CREATE POLICY "Authenticated users can manage evaluations" ON public.evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Policies cho AUDIT_LOGS (Chỉ đọc với người dùng xác thực, không ai được xóa log để đảm bảo minh bạch)
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System and Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "System and Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ==============================================================================================
-- PHẦN 3: TRIGGER TỰ ĐỘNG ĐỒNG BỘ USER TỪ AUTH.USERS SANG PROFILES
-- ==============================================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Chuyên viên Tuyển dụng'),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'RECRUITER'::user_role)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
