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
  job_id: string;
  original_filename: string;
  masked_name: string;
  status: string;
  created_at: string;
  text_preview?: string;
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

export interface EvaluationBreakdown {
  skills: BreakdownCategory;
  experience: BreakdownCategory;
  education: BreakdownCategory;
}

export interface InterviewQuestion {
  question: string;
  reason_to_ask: string;
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
  old_value?: any;
  new_value?: any;
  justification?: string;
  created_at: string;
}
