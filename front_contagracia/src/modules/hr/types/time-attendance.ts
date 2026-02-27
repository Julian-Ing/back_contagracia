// ==================== HORAS EXTRAS ====================

export type OvertimeType = 'HED' | 'HEN' | 'HEDDF' | 'HENDF' | 'HRN' | 'HRDDF' | 'HRNDF';

export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  HED: 'Hora Extra Diurna (25%)',
  HEN: 'Hora Extra Nocturna (75%)',
  HEDDF: 'Hora Extra Diurna Dom/Fest (100%)',
  HENDF: 'Hora Extra Nocturna Dom/Fest (150%)',
  HRN: 'Recargo Nocturno (35%)',
  HRDDF: 'Recargo Diurno Dom/Fest (75%)',
  HRNDF: 'Recargo Nocturno Dom/Fest (110%)',
};

export const OVERTIME_TYPE_SHORT: Record<OvertimeType, string> = {
  HED: 'HED 25%',
  HEN: 'HEN 75%',
  HEDDF: 'HEDDF 100%',
  HENDF: 'HENDF 150%',
  HRN: 'HRN 35%',
  HRDDF: 'HRDDF 75%',
  HRNDF: 'HRNDF 110%',
};

export type OvertimeStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  AUTO_APPROVED: 'Auto-aprobada',
};

export const OVERTIME_STATUS_COLORS: Record<OvertimeStatus, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  AUTO_APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export interface OvertimeRecord {
  id: string;
  third_party_id: string;
  overtime_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  overtime_type: OvertimeType;
  payroll_code: string | null;
  surcharge_pct: number | null;
  base_hourly_rate: number | null;
  calculated_amount: number | null;
  reason: string;
  notes: string | null;
  status: OvertimeStatus;
  approved_by_id: string | null;
  cost_center_id: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  third_party?: { id: string; name: string; identification_number: string } | null;
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

export interface OvertimeFilters {
  third_party_id?: string;
  date_from?: string;
  date_to?: string;
  status?: OvertimeStatus;
  overtime_type?: OvertimeType;
  page?: number;
  limit?: number;
}

export interface OvertimeListResponse {
  data: OvertimeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Holiday {
  date: string;
  name: string;
  type: string;
}
