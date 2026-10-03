import { apiClient } from './api';
import type { MonthlyCandidate } from '../types';

export interface InterviewEmailPayload {
  candidate_email: string;
  candidate_name: string;
  interview_type: 'ONLINE' | 'OFFLINE';
  interview_time: string;
  interview_location: string;
  interviewer_name?: string;
  custom_notes?: string;
  email_subject?: string;
  email_body?: string;
}

export interface BatchCandidateItemPayload {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
}

export interface BatchInterviewPayload {
  candidates: BatchCandidateItemPayload[];
  interview_type: 'ONLINE' | 'OFFLINE';
  interview_time: string;
  interview_location: string;
  interviewer_name?: string;
  custom_notes?: string;
  email_subject_template?: string;
  email_body_template?: string;
}

export interface BatchInterviewResult {
  total: number;
  success_count: number;
  failure_count: number;
  results: Array<{
    candidate_id: string;
    candidate_name: string;
    email: string;
    success: boolean;
    message: string;
  }>;
}

export const monthlyReportService = {
  fetchMonthlyCandidates: async (month?: number, year?: number): Promise<MonthlyCandidate[]> => {
    const params: Record<string, number> = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await apiClient.get('/monthly/candidates', { params });
    return response.data;
  },

  updateApprovalStatus: async (
    candidateId: string,
    approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string,
    reviewedBy?: string,
    sendRejectionEmail?: boolean,
    customEmailBody?: string
  ): Promise<{
    message: string;
    approval_status: string;
    rejection_reason?: string;
    email_sent?: boolean;
    email_message?: string;
  }> => {
    const response = await apiClient.patch(`/monthly/candidates/${candidateId}/approval`, {
      approval_status: approvalStatus,
      rejection_reason: rejectionReason,
      reviewed_by: reviewedBy,
      send_rejection_email: sendRejectionEmail,
      custom_email_body: customEmailBody,
    });
    return response.data;
  },

  sendInterviewEmail: async (
    candidateId: string,
    payload: InterviewEmailPayload
  ): Promise<{ success: boolean; message: string; candidate?: any }> => {
    const response = await apiClient.post(`/monthly/candidates/${candidateId}/send-interview-email`, payload);
    return response.data;
  },

  scheduleInterviewOnly: async (
    candidateId: string,
    payload: InterviewEmailPayload
  ): Promise<{ success: boolean; message: string; candidate?: any }> => {
    const response = await apiClient.post(`/monthly/candidates/${candidateId}/schedule-interview`, payload);
    return response.data;
  },

  batchSendInterviewEmails: async (
    payload: BatchInterviewPayload
  ): Promise<BatchInterviewResult> => {
    const response = await apiClient.post('/monthly/candidates/batch-send-interview', payload);
    return response.data;
  },

  exportMonthlyExcel: async (month?: number, year?: number, statusFilter?: string): Promise<void> => {
    const params: Record<string, string | number> = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (statusFilter && statusFilter !== 'ALL') params.status_filter = statusFilter;

    const response = await apiClient.get('/monthly/candidates/export-excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const periodStr = month && year ? `Thang_${month}_${year}` : (year ? `Nam_${year}` : 'Tat_Ca_Thang');
    link.setAttribute('download', `Bao_Cao_Ung_Vien_${periodStr}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
