import axios from 'axios';
import { supabase } from './supabase';
import type { Job, JobCriteria, Candidate, Evaluation, CandidateRanking, AuditLog } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn Supabase JWT Token vào mọi Request gửi lên Backend (Khắc phục SEC-01)
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Lỗi lấy Supabase token:', error);
  }
  return config;
});

// Bắt và xử lý lỗi xác thực từ Backend
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Backend từ chối truy cập: Phiên đăng nhập hết hạn hoặc chưa xác thực (401 Unauthorized)');
    } else if (error.response?.status === 403) {
      console.warn('Backend từ chối: Tài khoản chưa được cấp quyền (403 Forbidden)', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const jobApi = {
  create: async (data: { title: string; department?: string; description?: string; criteria: JobCriteria }): Promise<Job> => {
    const response = await apiClient.post('/jobs', data);
    return response.data;
  },
  list: async (): Promise<Job[]> => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },
  getById: async (id: string): Promise<Job> => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string; deleted_id: string }> => {
    const response = await apiClient.delete(`/jobs/${id}`);
    return response.data;
  },
};

export const candidateApi = {
  uploadBulk: async (jobId: string, files: File[]): Promise<Candidate[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const response = await apiClient.post(`/candidates/jobs/${jobId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  listByJob: async (jobId: string): Promise<Candidate[]> => {
    const response = await apiClient.get(`/candidates/jobs/${jobId}`);
    return response.data;
  },
  getPdfUrl: (candidateId: string): string => {
    return `${API_BASE_URL}/candidates/${candidateId}/pdf`;
  },
  delete: async (candidateId: string): Promise<{ message: string; deleted_id: string }> => {
    const response = await apiClient.delete(`/candidates/${candidateId}`);
    return response.data;
  },
};

export const evaluationApi = {
  getByCandidate: async (candidateId: string): Promise<Evaluation> => {
    const response = await apiClient.get(`/evaluations/candidate/${candidateId}`);
    return response.data;
  },
  process: async (candidateId: string): Promise<Evaluation> => {
    const response = await apiClient.post(`/evaluations/process/${candidateId}`);
    return response.data;
  },
  override: async (evaluationId: string, hr_override_score: number, hr_override_reason: string): Promise<Evaluation> => {
    const response = await apiClient.post(`/overrides/${evaluationId}`, {
      hr_override_score,
      hr_override_reason,
    });
    return response.data;
  },
};

export const analyticsApi = {
  getRanking: async (jobId: string): Promise<{ job_id: string; job_title: string; total_candidates: number; rankings: CandidateRanking[] }> => {
    const response = await apiClient.get(`/analytics/jobs/${jobId}/ranking`);
    return response.data;
  },
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const response = await apiClient.get('/analytics/audit-logs');
    return response.data;
  },
};
