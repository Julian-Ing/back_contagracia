export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'SPLIT' | 'CUSTOM';
export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ShiftAssignmentStatus = 'ASSIGNED' | 'CONFIRMED' | 'SWAP_REQUESTED' | 'SWAPPED' | 'CANCELLED';
export type ShiftSwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ShiftTemplate {
  id: string;
  name: string;
  code?: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  break_minutes: number;
  total_hours: number;
  color?: string;
  description?: string;
  is_overnight: boolean;
  is_active: boolean;
  created_at: string;
  _count?: { assignments: number };
}

export interface ShiftSchedule {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: ShiftStatus;
  notes?: string;
  published_at?: string;
  published_by?: string;
  publisher?: { name: string };
  _count?: { assignments: number };
}

export interface ShiftAssignment {
  id: string;
  third_party_id: string;
  shift_template_id: string;
  schedule_id?: string;
  date: string;
  custom_start_time?: string;
  custom_end_time?: string;
  status: ShiftAssignmentStatus;
  notes?: string;
  assigned_by?: string;
  third_party?: { name: string };
  shift_template?: { name: string; color?: string; start_time: string; end_time: string; shift_type: ShiftType };
  schedule?: { name: string };
}

export interface ShiftSwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  requester_assignment_id: string;
  target_assignment_id: string;
  reason?: string;
  status: ShiftSwapStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requester?: { name: string };
  target?: { name: string };
  requester_assignment?: ShiftAssignment;
  target_assignment?: ShiftAssignment;
  approver?: { name: string };
  created_at: string;
}

// DTOs
export interface CreateShiftTemplateDto {
  name: string;
  code?: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  break_minutes?: number;
  total_hours: number;
  color?: string;
  description?: string;
  is_overnight?: boolean;
}

export interface CreateScheduleDto {
  name: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface CreateAssignmentDto {
  third_party_id: string;
  shift_template_id: string;
  date: string;
  schedule_id?: string;
  custom_start_time?: string;
  custom_end_time?: string;
  notes?: string;
}

export interface QueryAssignmentsParams {
  third_party_id?: string;
  shift_template_id?: string;
  schedule_id?: string;
  date_from?: string;
  date_to?: string;
  status?: ShiftAssignmentStatus;
  page?: number;
  limit?: number;
}

export interface QuerySwapsParams {
  status?: ShiftSwapStatus;
  requester_id?: string;
  page?: number;
  limit?: number;
}

// Labels
export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
  SPLIT: 'Partido',
  CUSTOM: 'Personalizado',
};

export const ASSIGNMENT_STATUS_LABELS: Record<ShiftAssignmentStatus, string> = {
  ASSIGNED: 'Asignado',
  CONFIRMED: 'Confirmado',
  SWAP_REQUESTED: 'Intercambio Solicitado',
  SWAPPED: 'Intercambiado',
  CANCELLED: 'Cancelado',
};

export const ASSIGNMENT_STATUS_COLORS: Record<ShiftAssignmentStatus, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SWAP_REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SWAPPED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const SWAP_STATUS_LABELS: Record<ShiftSwapStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

export const SWAP_STATUS_COLORS: Record<ShiftSwapStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const SCHEDULE_STATUS_LABELS: Record<ShiftStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
};
