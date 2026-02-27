/**
 * Tipos para el modulo de Time & Attendance
 * Asistencia y Horas Extras
 */

// ==================== ESTADOS Y TIPOS ====================

export type OvertimeType = 'HED' | 'HEN' | 'HEDDF' | 'HENDF' | 'HRN' | 'HRDDF' | 'HRNDF';

export type OvertimeStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';

// ==================== LABELS ====================

export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  HED: 'HE Diurna (25%)',
  HEN: 'HE Nocturna (75%)',
  HEDDF: 'HE Diurna Dom/Fest (100%)',
  HENDF: 'HE Nocturna Dom/Fest (150%)',
  HRN: 'Recargo Nocturno (35%)',
  HRDDF: 'Recargo Dom Diurno (75%)',
  HRNDF: 'Recargo Dom Nocturno (110%)',
};

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  AUTO_APPROVED: 'Auto-Aprobada',
};

// ==================== COLORES ====================

export const OVERTIME_TYPE_COLORS: Record<OvertimeType, string> = {
  HED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HEN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  HEDDF: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  HENDF: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  HRN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  HRDDF: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  HRNDF: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
};

export const OVERTIME_STATUS_COLORS: Record<OvertimeStatus, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  AUTO_APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

// ==================== INTERFACES PRINCIPALES ====================

export interface AttendanceRecord {
  id: string;
  third_party_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  third_party: {
    id: string;
    name: string | null;
    identification_number: string | null;
  };
}

export interface OvertimeRecord {
  id: string;
  third_party_id: string;
  overtime_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  overtime_type: OvertimeType;
  payroll_code: string;
  surcharge_pct: number;
  base_hourly_rate: number | null;
  calculated_amount: number | null;
  reason: string;
  notes: string | null;
  status: OvertimeStatus;
  approved_by_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  cost_center_id: string | null;
  is_paid: boolean;
  paid_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  third_party: {
    id: string;
    name: string | null;
    identification_number: string | null;
  };
  approved_by?: {
    id: string;
    name: string | null;
  } | null;
  cost_center?: {
    id: string;
    name: string;
    consecutive: string;
  } | null;
}

export interface AttendanceStats {
  attendance: {
    total_active_employees: number;
    present_today: number;
    absent_today: number;
  };
  overtime: {
    pending_requests: number;
    this_month: {
      by_type: Record<string, { hours: number; amount: number; count: number }>;
      total_hours: number;
      total_amount: number;
    };
  };
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  type: string;
}

// ==================== DTOs ====================

export interface RegisterCheckinDto {
  third_party_id?: string;
  notes?: string;
}

export interface RegisterCheckoutDto {
  third_party_id?: string;
  notes?: string;
}

export interface EditAttendanceDto {
  check_in?: string;
  check_out?: string;
  notes?: string;
}

export interface CreateOvertimeDto {
  third_party_id?: string;
  overtime_date: string;
  start_time: string;
  end_time: string;
  overtime_type: OvertimeType;
  reason: string;
  notes?: string;
  cost_center_id?: string;
  auto_approve?: boolean;
}

export interface EditOvertimeDto {
  overtime_date?: string;
  start_time?: string;
  end_time?: string;
  overtime_type?: OvertimeType;
  reason?: string;
  notes?: string;
  cost_center_id?: string;
}

// ==================== RESPONSES ====================

export interface AttendanceResponse {
  data: AttendanceRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OvertimeResponse {
  data: OvertimeRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== FILTROS ====================

export interface AttendanceFilters {
  third_party_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface OvertimeFilters {
  third_party_id?: string;
  date_from?: string;
  date_to?: string;
  status?: OvertimeStatus;
  overtime_type?: OvertimeType;
  page?: number;
  limit?: number;
}
