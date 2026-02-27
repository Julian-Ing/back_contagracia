/**
 * Tax Calendar Types
 * Tipos para el módulo de calendario tributario DIAN
 */

// ============================================
// TIPOS DE OBLIGACIÓN
// ============================================

export interface TaxObligationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  has_nit_digit: boolean;
  frequency: TaxFrequency;
  is_declaration: boolean;
  is_payment: boolean;
  created_at: string;
  updated_at: string;
}

export type TaxFrequency =
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'quadrimestral'
  | 'annual'
  | 'specific';

// ============================================
// FECHAS DEL CALENDARIO
// ============================================

export interface TaxCalendarDate {
  id: string;
  tax_obligation_type_id: string;
  tax_obligation_type: TaxObligationType;
  year: number;
  month: number;
  nit_last_digit: number | null;
  due_date: string;
  period_name: string;
  is_declaration: boolean;
  is_payment: boolean;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// OBLIGACIONES DE EMPRESA
// ============================================

export interface CompanyObligation extends TaxCalendarDate {
  daysRemaining: number;
  urgency: ObligationUrgency;
  status: ObligationStatus;
}

export type ObligationUrgency = 'urgent' | 'soon' | 'normal';

export type ObligationStatus =
  | 'pending'
  | 'completed'
  | 'overdue'
  | 'exempted';

// ============================================
// RESPUESTAS DE API
// ============================================

export interface CalendarStatusResponse {
  loaded: boolean;
  dateCount: number;
  lastSync: string | null;
}

export interface SyncLogEntry {
  id: string;
  year: number;
  source: 'pdf_upload' | 'url_download' | 'dian_auto';
  source_url: string | null;
  dates_imported: number;
  status: 'success' | 'error' | 'partial';
  error_message: string | null;
  created_at: string;
}

export interface UpcomingObligationsResponse {
  company: {
    id: string;
    name: string;
    nit: string;
    nitLastDigit: string;
  };
  daysAhead: number;
  totalObligations: number;
  obligations: CompanyObligation[];
}

export interface CompanyCalendarResponse {
  company: {
    id: string;
    name: string;
    nit: string;
    nitLastDigit: string;
  };
  year: number;
  month?: number;
  totalObligations: number;
  obligations: TaxCalendarDate[];
}

// ============================================
// SINCRONIZACIÓN
// ============================================

export interface SyncFromUrlDto {
  url: string;
  year: number;
}

export interface SyncResult {
  success: boolean;
  year: number;
  source: string;
  datesImported: number;
  message: string;
}

export interface ParsePdfResult {
  year: number;
  totalDates: number;
  dates: ParsedDate[];
  taxTypesDetected: string[];
  parseErrors: string[];
  parseWarnings: string[];
  sourceUrl?: string;
}

export interface ParsedDate {
  taxObligationTypeCode: string;
  year: number;
  periodName: string;
  periodStartMonth?: number;
  periodEndMonth?: number;
  installmentNumber?: number;
  installmentDescription?: string;
  nitLastDigits?: string;
  dueDate: string;
  dueMonthName: string;
  dueDay: number;
  isDeclaration: boolean;
  isPayment: boolean;
}

// ============================================
// RECORDATORIOS
// ============================================

export interface ReminderExecutionResult {
  totalCompanies: number;
  totalObligations: number;
  notificationsSent: number;
  errors: number;
  duration: number;
}

export interface ReminderTestResult {
  company: {
    id: string;
    name: string;
    nit: string;
  };
  totalObligations: number;
  notificationsSent: number;
  errors: number;
}

export interface SchedulerStatus {
  enabled: boolean;
  cronExpression: string;
  daysAhead: number;
  includeOverdue: boolean;
  overdueMaxDays: number;
  timezone: string;
  message: string;
}

// ============================================
// FILTROS Y PARÁMETROS
// ============================================

export interface CalendarFilters {
  year: number;
  month?: number;
  obligationType?: string;
  urgency?: ObligationUrgency;
}

export interface UpcomingFilters {
  daysAhead?: number;
}
