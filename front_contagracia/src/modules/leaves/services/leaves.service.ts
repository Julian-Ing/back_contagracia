/**
 * Servicio de Vacaciones y Ausencias - HR Service
 * Comunicacion con el hr-service (puerto 3012)
 */

import { hrClient } from '@/shared/services/api/apiClient';
import type {
  LeavesResponse,
  LeaveRequestDetail,
  LeaveStats,
  VacationBalance,
  CreateLeaveDto,
  RequestLeaveDto,
  EditLeaveDto,
  QueryLeavesParams,
} from '../types';

export const leavesService = {
  // ==================== LISTADO Y DETALLE ====================

  async getAll(params: QueryLeavesParams = {}): Promise<LeavesResponse> {
    const queryParams: Record<string, string> = {};
    if (params.third_party_id) queryParams.third_party_id = params.third_party_id;
    if (params.status) queryParams.status = params.status;
    if (params.leave_type) queryParams.leave_type = params.leave_type;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.skip !== undefined) queryParams.skip = String(params.skip);
    if (params.take !== undefined) queryParams.take = String(params.take);

    const response = await hrClient.get<LeavesResponse>('/leaves', { params: queryParams });
    return response.data;
  },

  async getOne(id: string): Promise<LeaveRequestDetail> {
    const response = await hrClient.get<LeaveRequestDetail>(`/leaves/${id}`);
    return response.data;
  },

  async getStats(): Promise<LeaveStats> {
    const response = await hrClient.get<LeaveStats>('/leaves/stats');
    return response.data;
  },

  async getVacationBalance(employeeId: string): Promise<VacationBalance> {
    const response = await hrClient.get<VacationBalance>(`/leaves/vacation-balance/${employeeId}`);
    return response.data;
  },

  // ==================== CREACION ====================

  async create(data: CreateLeaveDto): Promise<{ message: string }> {
    const response = await hrClient.post<{ message: string }>('/leaves', data);
    return response.data;
  },

  async request(data: RequestLeaveDto): Promise<{ message: string }> {
    const response = await hrClient.post<{ message: string }>('/leaves/request', data);
    return response.data;
  },

  // ==================== EDICION ====================

  async update(id: string, data: EditLeaveDto): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/leaves/${id}`, data);
    return response.data;
  },

  // ==================== APROBACION / RECHAZO ====================

  async approve(id: string, adminNotes?: string): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/leaves/${id}/approve`, {
      admin_notes: adminNotes,
    });
    return response.data;
  },

  async reject(id: string, rejectionReason: string): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/leaves/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // ==================== ELIMINACION ====================

  async delete(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete<{ message: string }>(`/leaves/${id}`);
    return response.data;
  },
};
