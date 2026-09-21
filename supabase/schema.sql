-- ===================================================================
-- SCRIPT KHỞI TẠO BẢNG & PHÂN QUYỀN TRÊN SUPABASE SQL EDITOR
-- Dự án: AI-Powered CV Screening System
-- ===================================================================

-- 1. Tạo Enum Role người dùng
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'RECRUITER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tạo bảng Profiles liên kết với auth.users của Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'RECRUITER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tạo Policy cho Profiles
-- Cho phép người dùng đọc thông tin profile của chính mình
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Cho phép Admin xem toàn bộ danh sách profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- 4. Trigger tự động tạo bản ghi Profile khi có người dùng đăng ký mới qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Chuyên viên Nhân sự'),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'RECRUITER'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Gợi ý: Bạn có thể dán toàn bộ script này vào tab "SQL Editor" trên Supabase Dashboard và nhấn "Run"!
