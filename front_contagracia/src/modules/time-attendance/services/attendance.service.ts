/**
 * Servicio de Asistencia y Horas Extras - HR Service
 * Comunicacion con el hr-service (puerto 3012)
 */

import { hrClient } from '@/shared/services/api/apiClient';
import type {
  AttendanceRecord,
  AttendanceResponse,
  AttendanceFilters,
  AttendanceStats,
  OvertimeRecord,
  OvertimeResponse,
  OvertimeFilters,
  RegisterCheckinDto,
  RegisterCheckoutDto,
  EditAttendanceDto,
  CreateOvertimeDto,
  EditOvertimeDto,
  Holiday,
} from '../types';

export const attendanceService = {
  // ==================== ASISTENCIA ====================

  async getAll(filters: AttendanceFilters = {}): Promise<AttendanceResponse> {
    const params: Record<string, string> = {};
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await hrClient.get<AttendanceResponse>('/time-attendance', { params });
    return response.data;
  },

  async checkin(data: RegisterCheckinDto): Promise<AttendanceRecord> {
    const response = await hrClient.post<AttendanceRecord>('/time-attendance/checkin', data);
    return response.data;
  },

  async checkout(data: RegisterCheckoutDto): Promise<AttendanceRecord> {
    const response = await hrClient.post<AttendanceRecord>('/time-attendance/checkout', data);
    return response.data;
  },

  async edit(id: string, data: EditAttendanceDto): Promise<AttendanceRecord> {
    const response = await hrClient.patch<AttendanceRecord>(`/time-attendance/${id}`, data);
    return response.data;
  },

  async getStats(): Promise<AttendanceStats> {
    const response = await hrClient.get<AttendanceStats>('/time-attendance/stats');
    return response.data;
  },

  // ==================== HORAS EXTRAS ====================

  async getOvertime(filters: OvertimeFilters = {}): Promise<OvertimeResponse> {
    const params: Record<string, string> = {};
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.status) params.status = filters.status;
    if (filters.overtime_type) params.overtime_type = filters.overtime_type;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await hrClient.get<OvertimeResponse>('/time-attendance/overtime', { params });
    return response.data;
  },

  async createOvertime(data: CreateOvertimeDto): Promise<OvertimeRecord> {
    const response = await hrClient.post<OvertimeRecord>('/time-attendance/overtime', data);
    return response.data;
  },

  async editOvertime(id: string, data: EditOvertimeDto): Promise<OvertimeRecord> {
    const response = await hrClient.patch<OvertimeRecord>(`/time-attendance/overtime/${id}`, data);
    return response.data;
  },

  async deleteOvertime(id: string): Promise<void> {
    await hrClient.delete(`/time-attendance/overtime/${id}`);
  },

  async approveOvertime(id: string): Promise<OvertimeRecord> {
    const response = await hrClient.patch<OvertimeRecord>(`/time-attendance/overtime/${id}/approve`);
    return response.data;
  },

  async rejectOvertime(id: string, rejectionReason: string): Promise<OvertimeRecord> {
    const response = await hrClient.patch<OvertimeRecord>(`/time-attendance/overtime/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // ==================== FESTIVOS ====================

  async getHolidays(year: number): Promise<Holiday[]> {
    const response = await hrClient.get<Holiday[]>(`/time-attendance/holidays/${year}`);
    return response.data;
  },
};
