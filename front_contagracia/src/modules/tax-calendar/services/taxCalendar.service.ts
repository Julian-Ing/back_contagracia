/**
 * Tax Calendar Service
 * Servicios para interactuar con el API del calendario tributario DIAN
 */

import { taxClient } from '@/shared/services/api/apiClient';
import type {
  TaxObligationType,
  CalendarStatusResponse,
  SyncLogEntry,
  UpcomingObligationsResponse,
  CompanyCalendarResponse,
  SyncFromUrlDto,
  ParsePdfResult,
  ReminderExecutionResult,
  ReminderTestResult,
  SchedulerStatus,
} from '../types';

// ============================================
// BASE PATH
// ============================================

const BASE = '/tax-calendar';
const companyBase = (companyId: string) => `/companies/${companyId}/tax-calendar`;

// ============================================
// TIPOS DE OBLIGACIÓN
// ============================================

export const obligationTypesService = {
  /**
   * Obtiene todos los tipos de obligaciones tributarias
   */
  getAll: (): Promise<TaxObligationType[]> =>
    taxClient.get(`${BASE}/tipos`).then((r) => r.data),
};

// ============================================
// ESTADO Y SINCRONIZACIÓN
// ============================================

export const syncService = {
  /**
   * Verifica si un año está cargado en la base de datos
   */
  getStatus: (year: number): Promise<CalendarStatusResponse> =>
    taxClient.get(`${BASE}/status/${year}`).then((r) => r.data),

  /**
   * Obtiene el historial de sincronizaciones
   */
  getSyncLogs: (limit?: number): Promise<SyncLogEntry[]> =>
    taxClient.get(`${BASE}/sync-logs`, { params: { limit } }).then((r) => r.data),

  /**
   * Sincroniza el calendario desde DIAN automáticamente
   * Retorna PdfParseResult del backend
   */
  syncFromDian: (year: number): Promise<ParsePdfResult> =>
    taxClient.post(`${BASE}/sync/${year}`).then((r) => r.data),

  /**
   * Sincroniza el calendario desde una URL de PDF
   * Retorna PdfParseResult del backend
   */
  syncFromUrl: (data: SyncFromUrlDto): Promise<ParsePdfResult> =>
    taxClient.post(`${BASE}/sync-from-url`, data).then((r) => r.data),

  /**
   * Sincroniza el calendario desde un archivo PDF subido
   * Retorna PdfParseResult del backend
   */
  syncFromPdf: (file: File, year: number): Promise<ParsePdfResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year.toString());
    return taxClient
      .post(`${BASE}/sync-from-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /**
   * Parsea un PDF sin guardar (preview)
   */
  parsePdf: (file: File, year: number): Promise<ParsePdfResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year.toString());
    return taxClient
      .post(`${BASE}/parse-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

// ============================================
// CALENDARIO POR EMPRESA
// ============================================

export const calendarService = {
  /**
   * Obtiene el calendario de obligaciones de una empresa
   */
  getCompanyCalendar: (
    companyId: string,
    year: number,
    month?: number
  ): Promise<CompanyCalendarResponse> =>
    taxClient
      .get(`${BASE}/${companyId}/obligaciones`, { params: { year, month } })
      .then((r) => r.data),

  /**
   * Obtiene las obligaciones próximas de una empresa
   */
  getUpcomingObligations: (
    companyId: string,
    daysAhead?: number
  ): Promise<UpcomingObligationsResponse> =>
    taxClient
      .get(`${BASE}/${companyId}/proximas`, { params: { daysAhead } })
      .then((r) => r.data),

  /**
   * Vista mensual del calendario (para UI)
   */
  getMonthlyCalendar: (
    companyId: string,
    year: number,
    month: number
  ): Promise<CompanyCalendarResponse> =>
    taxClient.get(`${BASE}/${companyId}/mes/${year}/${month}`).then((r) => r.data),
};

// ============================================
// RECORDATORIOS
// ============================================

export const reminderService = {
  /**
   * Ejecuta los recordatorios manualmente
   */
  executeReminders: (
    daysAhead?: number,
    includeOverdue?: boolean
  ): Promise<ReminderExecutionResult> =>
    taxClient
      .post(`${BASE}/recordatorios/ejecutar`, null, {
        params: { daysAhead, includeOverdue },
      })
      .then((r) => r.data),

  /**
   * Prueba recordatorios para una empresa específica
   */
  testForCompany: (
    companyId: string,
    daysAhead?: number
  ): Promise<ReminderTestResult> =>
    taxClient
      .post(`${BASE}/recordatorios/test/${companyId}`, null, {
        params: { daysAhead },
      })
      .then((r) => r.data),

  /**
   * Obtiene el estado del scheduler de recordatorios
   */
  getSchedulerStatus: (): Promise<SchedulerStatus> =>
    taxClient.get(`${BASE}/recordatorios/scheduler-status`).then((r) => r.data),
};

// ============================================
// EXPORT UNIFICADO
// ============================================

export const taxCalendarService = {
  types: obligationTypesService,
  sync: syncService,
  calendar: calendarService,
  reminders: reminderService,
};

export default taxCalendarService;
