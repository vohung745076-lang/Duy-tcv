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
    reviewedBy?: string
  ): Promise<{ message: string; approval_status: string; rejection_reason?: string }> => {
    const response = await apiClient.patch(`/monthly/candidates/${candidateId}/approval`, {
      approval_status: approvalStatus,
      rejection_reason: rejectionReason,
      reviewed_by: reviewedBy,
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
};
