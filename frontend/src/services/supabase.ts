import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nalriiuaglaefulqqbrb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'RECRUITER' | 'PENDING';
  avatar_url?: string;
  webhook_url?: string;
}

export const authService = {
  // Đăng nhập bằng Google OAuth2
  signInWithGoogle: async () => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : 'https://duy-tcv.vercel.app/';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  // Lấy hoặc khởi tạo Hồ sơ người dùng trong bảng public.profiles trên Supabase (Dữ liệu thật 100%)
  fetchOrCreateProfile: async (user: any): Promise<UserProfile> => {
    if (!user?.id) {
      throw new Error('Dữ liệu người dùng không hợp lệ.');
    }

    try {
      // 1. Luôn truy vấn hồ sơ thật từ bảng public.profiles trên Supabase
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          email: data.email || user.email,
          full_name: data.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
          role: (data.role as 'ADMIN' | 'RECRUITER' | 'PENDING') || 'PENDING',
          avatar_url: user.user_metadata?.avatar_url,
          webhook_url: (data as any).webhook_url,
        };
      }

      // 2. Nếu người dùng mới chưa có trong profiles, tự động tạo dòng mới THẬT với role = 'PENDING'
      // Chú ý: Bảng profiles trong Supabase chỉ có các cột: id, email, full_name, role
      // Tuyệt đối không gửi avatar_url vì cột này không tồn tại trong DB Supabase
      const newProfilePayload = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng mới',
        role: 'PENDING' as const, // Mặc định 100% tài khoản mới là PENDING chờ Admin duyệt trên Supabase
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .upsert(newProfilePayload, { onConflict: 'id' })
        .select('id, email, full_name, role')
        .single();

      if (insertError) {
        console.error('Lỗi khi ghi profile mới vào Supabase:', insertError);
      }

      return {
        id: user.id,
        email: user.email,
        full_name: insertedData?.full_name || newProfilePayload.full_name,
        role: (insertedData?.role as 'ADMIN' | 'RECRUITER' | 'PENDING') || 'PENDING',
        avatar_url: user.user_metadata?.avatar_url,
      };
    } catch (err) {
      console.error('Lỗi truy vấn hồ sơ từ Supabase:', err);
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng',
        role: 'PENDING',
        avatar_url: user.user_metadata?.avatar_url,
      };
    }
  },

  // Đăng xuất
  signOut: async () => {
    await supabase.auth.signOut();
  },
};
