// ==================== Enums & Labels ====================

export type ObservationType = 'RECOGNITION' | 'FEEDBACK' | 'INCIDENT' | 'WARNING' | 'ACHIEVEMENT' | 'CONCERN';
export type ObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ObservationStatus = 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, string> = {
  RECOGNITION: 'Reconocimiento',
  FEEDBACK: 'Retroalimentación',
  INCIDENT: 'Incidente',
  WARNING: 'Amonestación',
  ACHIEVEMENT: 'Logro',
  CONCERN: 'Preocupación',
};

export const OBSERVATION_TYPE_COLORS: Record<ObservationType, string> = {
  RECOGNITION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FEEDBACK: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  INCIDENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ACHIEVEMENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  CONCERN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const SEVERITY_LABELS: Record<ObservationSeverity, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const SEVERITY_COLORS: Record<ObservationSeverity, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const STATUS_LABELS: Record<ObservationStatus, string> = {
  ACTIVE: 'Activa',
  RESOLVED: 'Resuelta',
  ARCHIVED: 'Archivada',
};

export const STATUS_COLORS: Record<ObservationStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RESOLVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// ==================== Interfaces ====================

export interface Observation {
  id: string;
  third_party_id: string;
  title: string;
  description: string;
  observation_date: string;
  observation_type: ObservationType;
  severity: ObservationSeverity;
  status: ObservationStatus;
  action_required: string | null;
  follow_up_date: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  third_party: {
    id: string;
    name: string;
    identification_number: string;
  };
  employee_profile_id?: string;
  employee_profile?: {
    id: string;
    third_party: {
      id: string;
      name: string;
      identification_number?: string;
    };
  };
  created_by: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ObservationsResponse {
  data: Observation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ObservationStats {
  total: number;
  active: number;
  pending_follow_up: number;
  by_type: { type: ObservationType; count: number }[];
  by_severity: { severity: ObservationSeverity; count: number }[];
  by_status: { status: ObservationStatus; count: number }[];
}

export interface ObservationFilters {
  page?: number;
  limit?: number;
  search?: string;
  third_party_id?: string;
  observation_type?: ObservationType;
  severity?: ObservationSeverity;
  status?: ObservationStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateObservationDto {
  third_party_id: string;
  title: string;
  description: string;
  observation_date: string;
  observation_type: ObservationType;
  severity?: ObservationSeverity;
  action_required?: string;
  follow_up_date?: string;
}

export interface UpdateObservationDto {
  title?: string;
  description?: string;
  observation_date?: string;
  observation_type?: ObservationType;
  severity?: ObservationSeverity;
  status?: ObservationStatus;
  action_required?: string;
  follow_up_date?: string;
}
