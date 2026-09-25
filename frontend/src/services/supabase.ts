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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  // Lấy hoặc khởi tạo Hồ sơ người dùng trong bảng public.profiles trên Supabase
  fetchOrCreateProfile: async (user: any): Promise<UserProfile> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        return {
          id: data.id,
          email: data.email || user.email,
          full_name: data.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
          role: (data.role as 'ADMIN' | 'RECRUITER' | 'PENDING') || 'PENDING',
          avatar_url: data.avatar_url || user.user_metadata?.avatar_url,
          webhook_url: data.webhook_url,
        };
      }

      // Nếu người dùng mới chưa có trong profiles, tự động tạo dòng mới với role = 'PENDING'
      const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || '',
        role: user.email === 'vohung745076@gmail.com' ? 'ADMIN' : 'PENDING',
      };

      await supabase.from('profiles').insert([newProfile]);
      return newProfile as UserProfile;
    } catch (err) {
      console.warn('Không thể đọc bảng profiles trên Supabase, dùng profile mặc định:', err);
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        role: user.email === 'vohung745076@gmail.com' ? 'ADMIN' : 'PENDING',
        avatar_url: user.user_metadata?.avatar_url,
      };
    }
  },

  // Đăng xuất
  signOut: async () => {
    await supabase.auth.signOut();
  },
};
