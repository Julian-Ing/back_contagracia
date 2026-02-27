import { hrClient } from '@/shared/services/api/apiClient';
import type {
  OvertimeRecord,
  CreateOvertimeDto,
  EditOvertimeDto,
  OvertimeFilters,
  OvertimeListResponse,
  Holiday,
} from '../types/time-attendance';

const BASE = '/time-attendance';

export const timeAttendanceService = {
  // ==================== OVERTIME ====================

  async getOvertime(filters: OvertimeFilters = {}): Promise<OvertimeListResponse> {
    const params: Record<string, string> = {};
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.status) params.status = filters.status;
    if (filters.overtime_type) params.overtime_type = filters.overtime_type;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const res = await hrClient.get(`${BASE}/overtime`, { params });
    return res.data;
  },

  async createOvertime(data: CreateOvertimeDto): Promise<OvertimeRecord> {
    const res = await hrClient.post(`${BASE}/overtime`, data);
    return res.data;
  },

  async editOvertime(id: string, data: EditOvertimeDto): Promise<OvertimeRecord> {
    const res = await hrClient.patch(`${BASE}/overtime/${id}`, data);
    return res.data;
  },

  async deleteOvertime(id: string): Promise<void> {
    await hrClient.delete(`${BASE}/overtime/${id}`);
  },

  async approveOvertime(id: string): Promise<OvertimeRecord> {
    const res = await hrClient.patch(`${BASE}/overtime/${id}/approve`);
    return res.data;
  },

  async rejectOvertime(id: string, reason: string): Promise<OvertimeRecord> {
    const res = await hrClient.patch(`${BASE}/overtime/${id}/reject`, { reason });
    return res.data;
  },

  // ==================== HOLIDAYS ====================

  async getHolidays(year: number): Promise<Holiday[]> {
    const res = await hrClient.get(`${BASE}/holidays/${year}`);
    return res.data;
  },
};
