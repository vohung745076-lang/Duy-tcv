export interface CriteriaWeights {
  skills: number;
  experience: number;
  education: number;
}

export interface JobCriteria {
  weights: CriteriaWeights;
  required_skills: string[];
  preferred_skills: string[];
  min_years_experience: number;
  education_level: string;
}

export interface Job {
  id: string;
  title: string;
  department?: string;
  description?: string;
  criteria: JobCriteria;
  status: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  job_id?: string | null;
  original_filename: string;
  masked_name: string;
  status: string;
  created_at: string;
  text_preview?: string;
  masked_text?: string;
  raw_text?: string;
  email?: string;
  phone?: string;
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  rejection_reason?: string | null;
  interview_type?: 'ONLINE' | 'OFFLINE' | string | null;
  interview_location?: string | null;
  reviewed_by?: string | null;
  google_drive_url?: string | null;
}

export interface GoogleSyncRow {
  row_index: number;
  name: string;
  email?: string;
  phone?: string;
  drive_url?: string;
  status: 'IMPORTED' | 'DUPLICATE' | 'NEEDS_PERMISSION' | 'FAILED';
  message: string;
  candidate_id?: string;
}

export interface GoogleSyncResult {
  success: boolean;
  sheet_title?: string;
  total_rows: number;
  newly_imported: number;
  duplicates_skipped: number;
  permission_issues: number;
  candidates: Candidate[];
  reconciliation_rows: GoogleSyncRow[];
  message: string;
}

export interface MonthlyCandidate {
  id: string;
  job_id?: string | null;
  job_title?: string;
  masked_name: string;
  original_filename: string;
  status: string;
  created_at: string;
  month: number;
  year: number;
  email: string;
  phone: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  interview_type?: 'ONLINE' | 'OFFLINE' | null;
  interview_time?: string | null;
  interview_location?: string | null;
  reviewed_by?: string | null;
  overall_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  ai_summary?: string | null;
}

export interface EvidenceItem {
  criterion: string;
  matched: boolean;
  score: number;
  raw_quote: string;
  explanation: string;
}

export interface BreakdownCategory {
  score: number;
  evidence: EvidenceItem[];
}

export interface AdditionalHighlight {
  category: string;
  title: string;
  raw_quote: string;
  value_add_analysis: string;
  is_hr_added?: boolean;
  added_by?: string;
}

export interface IndustryCertification {
  category: string;
  title: string;
  raw_quote: string;
  value_add_analysis: string;
}

export interface EvaluationBreakdown {
  skills: BreakdownCategory;
  experience: BreakdownCategory;
  education: BreakdownCategory;
  evidence?: EvidenceItem[];
  industry_certifications?: IndustryCertification[];
  additional_highlights?: AdditionalHighlight[];
}

export interface InterviewQuestion {
  question: string;
  reason_to_ask?: string;
  purpose?: string;
}

export interface Evaluation {
  id: string;
  candidate_id: string;
  job_id: string;
  overall_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  breakdown: EvaluationBreakdown;
  interview_questions: InterviewQuestion[];
  ai_summary: string;
  hr_override_score?: number;
  hr_override_reason?: string;
  evaluation_status: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateRanking {
  candidate_id: string;
  masked_name: string;
  original_filename: string;
  status: string;
  final_score: number;
  ai_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  is_overridden: boolean;
  evaluation_status: string;
  ai_summary: string;
  override_reason?: string;
  created_at: string;
  rank: number;
}

export interface AuditLog {
  id: string;
  evaluation_id?: string;
  user_id?: string;
  action: string;
  details?: string;
  old_value?: any;
  new_value?: any;
  justification?: string;
  created_at: string;
}
