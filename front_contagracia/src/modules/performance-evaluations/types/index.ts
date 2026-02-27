export type EvaluationStatus = 'DRAFT' | 'COMPLETED' | 'APPROVED';

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Borrador',
  COMPLETED: 'Completada',
  APPROVED: 'Aprobada',
};

export const EVALUATION_STATUS_COLORS: Record<EvaluationStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export interface Evaluation {
  id: string;
  third_party_id: string;
  evaluation_period: string;
  evaluation_date: string;
  status: EvaluationStatus;
  attendance_score: number | null;
  performance_score: number | null;
  attitude_score: number | null;
  overall_score: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals_next_period: string | null;
  evaluator_comments: string | null;
  employee_comments: string | null;
  evaluator_id: string;
  created_at: string;
  updated_at: string;
  third_party: {
    id: string;
    name: string;
    identification_number: string;
  };
  evaluator: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface EvaluationsResponse {
  data: Evaluation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EvaluationFilters {
  page?: number;
  limit?: number;
  search?: string;
  third_party_id?: string;
  evaluation_period?: string;
  status?: EvaluationStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateEvaluationDto {
  third_party_id: string;
  evaluation_period: string;
  evaluation_date: string;
  attendance_score?: number;
  performance_score?: number;
  attitude_score?: number;
  overall_score?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals_next_period?: string;
  evaluator_comments?: string;
  employee_comments?: string;
}

export interface UpdateEvaluationDto {
  evaluation_period?: string;
  evaluation_date?: string;
  attendance_score?: number;
  performance_score?: number;
  attitude_score?: number;
  overall_score?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals_next_period?: string;
  evaluator_comments?: string;
  employee_comments?: string;
}

export interface GenerateEvaluationsDto {
  evaluation_period: string;
  date_from?: string;
  date_to?: string;
}

export interface GenerateEvaluationsResponse {
  period: string;
  generated_count: number;
  skipped_count: number;
  generated: {
    evaluation_id: string;
    employee_name: string;
    overall_score: number;
    risk_level: string;
  }[];
  skipped: string[];
}

// ==================== Dashboard / Analysis Types ====================

export type TrendDirection = 'improving' | 'declining' | 'stable';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const TREND_LABELS: Record<TrendDirection, string> = {
  improving: 'Mejorando',
  declining: 'Empeorando',
  stable: 'Estable',
};

export interface EmployeeMetrics {
  third_party_id: string;
  employee_name: string;
  identification_number: string;
  attendance_score: number;
  performance_score: number;
  attitude_score: number;
  overall_score: number;
  risk_level: RiskLevel;
  risk_score: number;
  trend: TrendDirection;
  observations_summary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  attendance_summary: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    attendance_rate: number;
    punctuality_rate: number;
  };
  recommendations: string[];
}

export interface DashboardSummary {
  total_employees: number;
  average_score: number;
  top_performers_count: number;
  needs_attention_count: number;
  rising_stars_count: number;
  risk_distribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface DashboardResponse {
  period: {
    date_from: string;
    date_to: string;
  };
  summary: DashboardSummary;
  top_performers: EmployeeMetrics[];
  needs_attention: EmployeeMetrics[];
  rising_stars: EmployeeMetrics[];
  all_employees: EmployeeMetrics[];
}

export interface DashboardFilters {
  period?: '1m' | '3m' | '6m' | '1y';
  date_from?: string;
  date_to?: string;
}
