/**
 * Types for Leaves / Vacaciones y Ausencias Module
 */

export type LeaveType =
  | 'SICK_LEAVE'
  | 'VACATION'
  | 'VACATION_MONETIZED'
  | 'PERSONAL_LEAVE'
  | 'COMPENSATORY_TIME'
  | 'UNPAID_LEAVE'
  | 'MATERNITY_LEAVE'
  | 'PATERNITY_LEAVE';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  third_party_id: string;
  employee_name: string;
  leave_type: LeaveType;
  leave_type_label: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: LeaveStatus;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  source: string;
  created_at: string;
}

export interface LeaveRequestDetail extends LeaveRequest {
  employee_identification?: string;
  created_by_id?: string;
  updated_at?: string;
}

export interface LeavesResponse {
  data: LeaveRequest[];
  total: number;
  skip: number;
  take: number;
}

export interface LeaveStats {
  pending: number;
  approved_this_month: number;
  this_month: {
    total: number;
    by_type: Array<{
      leave_type: LeaveType;
      label: string;
      count: number;
      days: number;
    }>;
  };
}

export interface VacationBalance {
  employee_id: string;
  employee_name: string;
  max_days: number;
  days_used: number;
  days_remaining: number;
  requests: Array<{
    leave_type: LeaveType;
    days_requested: number;
    start_date: string;
    end_date: string;
  }>;
}

export interface CreateLeaveDto {
  third_party_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
}

export interface RequestLeaveDto {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
}

export interface EditLeaveDto {
  leave_type?: LeaveType;
  start_date?: string;
  end_date?: string;
  days_requested?: number;
  reason?: string;
  admin_notes?: string;
}

export interface QueryLeavesParams {
  third_party_id?: string;
  status?: LeaveStatus;
  leave_type?: LeaveType;
  start_date?: string;
  end_date?: string;
  skip?: number;
  take?: number;
}

// Labels y colores

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  SICK_LEAVE: 'Incapacidad Medica',
  VACATION: 'Vacaciones',
  VACATION_MONETIZED: 'Vacaciones Monetizadas',
  PERSONAL_LEAVE: 'Permiso Personal',
  COMPENSATORY_TIME: 'Tiempo Compensatorio',
  UNPAID_LEAVE: 'Permiso Sin Sueldo',
  MATERNITY_LEAVE: 'Licencia Maternidad',
  PATERNITY_LEAVE: 'Licencia Paternidad',
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  SICK_LEAVE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VACATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VACATION_MONETIZED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PERSONAL_LEAVE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COMPENSATORY_TIME: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UNPAID_LEAVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MATERNITY_LEAVE: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  PATERNITY_LEAVE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const LEAVE_TYPE_OPTIONS: Array<{ value: LeaveType; label: string }> = [
  { value: 'SICK_LEAVE', label: 'Incapacidad Medica' },
  { value: 'VACATION', label: 'Vacaciones' },
  { value: 'VACATION_MONETIZED', label: 'Vacaciones Monetizadas' },
  { value: 'PERSONAL_LEAVE', label: 'Permiso Personal' },
  { value: 'COMPENSATORY_TIME', label: 'Tiempo Compensatorio' },
  { value: 'UNPAID_LEAVE', label: 'Permiso Sin Sueldo' },
  { value: 'MATERNITY_LEAVE', label: 'Licencia Maternidad' },
  { value: 'PATERNITY_LEAVE', label: 'Licencia Paternidad' },
];
