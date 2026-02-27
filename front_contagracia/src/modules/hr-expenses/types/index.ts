/**
 * Types for HR Expenses / Gastos Viaticos Module
 */

export type TravelExpenseCategory =
  | 'BUSINESS_TRIP'
  | 'TRAINING'
  | 'CLIENT_MEETING'
  | 'CONFERENCE'
  | 'PROJECT_VISIT'
  | 'AUDIT'
  | 'RECRUITMENT'
  | 'MAINTENANCE'
  | 'SALES_VISIT'
  | 'OTHER';

export type TravelExpenseStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'PENDING_LEGALIZATION'
  | 'LEGALIZED'
  | 'CANCELLED';

export interface TravelExpense {
  id: string;
  expense_code: string | null;
  third_party_id: string;
  employee_name: string;
  expense_category: TravelExpenseCategory;
  expense_category_label: string;
  travel_purpose: string;
  destination: string;
  start_date: string;
  end_date: string;
  assigned_amount: number;
  reported_amount: number | null;
  amount_difference: number | null;
  status: TravelExpenseStatus;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  notes: string | null;
  cost_center_name: string | null;
  created_at: string;
}

export interface TravelExpenseDetail extends TravelExpense {
  employee_identification: string | null;
  reported_at: string | null;
  cost_center: { id: string; name: string; code: string } | null;
  created_by_id: string | null;
  updated_at: string | null;
}

export interface TravelExpensesResponse {
  data: TravelExpense[];
  total: number;
  skip: number;
  take: number;
}

export interface TravelExpenseStats {
  pending: number;
  approved_this_month: number;
  total_assigned_this_month: number;
  this_month: {
    total: number;
    by_category: Array<{
      expense_category: TravelExpenseCategory;
      label: string;
      count: number;
      total: number;
    }>;
  };
}

export interface CreateTravelExpenseDto {
  third_party_id: string;
  expense_category: TravelExpenseCategory;
  travel_purpose: string;
  destination: string;
  start_date: string;
  end_date: string;
  assigned_amount: number;
  cost_center_id?: string;
  notes?: string;
}

export interface RequestTravelExpenseDto {
  expense_category: TravelExpenseCategory;
  travel_purpose: string;
  destination: string;
  start_date: string;
  end_date: string;
  assigned_amount: number;
  cost_center_id?: string;
  notes?: string;
}

export interface EditTravelExpenseDto {
  expense_category?: TravelExpenseCategory;
  travel_purpose?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  assigned_amount?: number;
  cost_center_id?: string;
  notes?: string;
  admin_notes?: string;
}

export interface QueryTravelExpensesParams {
  third_party_id?: string;
  status?: TravelExpenseStatus;
  expense_category?: TravelExpenseCategory;
  start_date?: string;
  end_date?: string;
  skip?: number;
  take?: number;
}

// Labels y colores

export const EXPENSE_CATEGORY_LABELS: Record<TravelExpenseCategory, string> = {
  BUSINESS_TRIP: 'Viaje de Negocios',
  TRAINING: 'Capacitacion',
  CLIENT_MEETING: 'Reunion con Cliente',
  CONFERENCE: 'Conferencia',
  PROJECT_VISIT: 'Visita a Proyecto',
  AUDIT: 'Auditoria',
  RECRUITMENT: 'Reclutamiento',
  MAINTENANCE: 'Mantenimiento',
  SALES_VISIT: 'Visita Comercial',
  OTHER: 'Otro',
};

export const EXPENSE_CATEGORY_COLORS: Record<TravelExpenseCategory, string> = {
  BUSINESS_TRIP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TRAINING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CLIENT_MEETING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONFERENCE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PROJECT_VISIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  AUDIT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RECRUITMENT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  MAINTENANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SALES_VISIT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const EXPENSE_STATUS_LABELS: Record<TravelExpenseStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  IN_PROGRESS: 'En Curso',
  PENDING_LEGALIZATION: 'Pend. Legalizacion',
  LEGALIZED: 'Legalizado',
  CANCELLED: 'Cancelado',
};

export const EXPENSE_STATUS_COLORS: Record<TravelExpenseStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PENDING_LEGALIZATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  LEGALIZED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const EXPENSE_CATEGORY_OPTIONS: Array<{ value: TravelExpenseCategory; label: string }> = [
  { value: 'BUSINESS_TRIP', label: 'Viaje de Negocios' },
  { value: 'TRAINING', label: 'Capacitacion' },
  { value: 'CLIENT_MEETING', label: 'Reunion con Cliente' },
  { value: 'CONFERENCE', label: 'Conferencia' },
  { value: 'PROJECT_VISIT', label: 'Visita a Proyecto' },
  { value: 'AUDIT', label: 'Auditoria' },
  { value: 'RECRUITMENT', label: 'Reclutamiento' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'SALES_VISIT', label: 'Visita Comercial' },
  { value: 'OTHER', label: 'Otro' },
];

export const EXPENSE_STATUS_OPTIONS: Array<{ value: TravelExpenseStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'IN_PROGRESS', label: 'En Curso' },
  { value: 'PENDING_LEGALIZATION', label: 'Pend. Legalizacion' },
  { value: 'LEGALIZED', label: 'Legalizado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];
